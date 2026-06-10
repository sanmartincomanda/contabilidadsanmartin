const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

admin.initializeApp();

const firestore = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const REPORT_EMAIL_USER = defineSecret('REPORT_EMAIL_USER');
const REPORT_EMAIL_PASSWORD = defineSecret('REPORT_EMAIL_PASSWORD');

const AUTOMATIC_REPORTS_CONFIG_REF = 'configuracion/reportesAutomaticos';
const DEFAULT_DAILY_REPORT_RECIPIENT = 'carnessanmartingranada@gmail.com';

const FUNCTION_OPTIONS = {
  region: 'us-central1',
  timeoutSeconds: 120,
  memory: '256MiB',
  schedule: 'every 15 minutes',
  timeZone: 'America/Managua',
  secrets: [
    REPORT_EMAIL_USER,
    REPORT_EMAIL_PASSWORD,
  ],
};

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeComparableText(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeAmount(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

function getDateTimePartsInTimezone(date = new Date(), timezone = 'America/Managua') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'America/Managua',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour || 0),
    minute: Number(parts.minute || 0),
  };
}

function getTimeMinutes(value = '19:30') {
  const [hour, minute] = String(value || '19:30').split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return (19 * 60) + 30;
  return (hour * 60) + minute;
}

function normalizeAutomaticReportsConfig(config = {}) {
  const reports = Array.isArray(config.reports) && config.reports.length > 0
    ? config.reports
    : [{
      id: 'daily-expenses',
      name: 'Reporte diario de gastos',
      type: 'gastosDiarios',
      active: true,
      sendTime: '19:30',
      timezone: 'America/Managua',
      attachPdf: true,
      recipients: [DEFAULT_DAILY_REPORT_RECIPIENT],
    }];

  return reports.map((report) => ({
    id: report.id || `report-${Date.now()}`,
    name: report.name || 'Reporte automatico',
    type: report.type || 'gastosDiarios',
    active: report.active !== false,
    sendTime: report.sendTime || '19:30',
    timezone: report.timezone || 'America/Managua',
    attachPdf: report.attachPdf !== false,
    recipients: Array.isArray(report.recipients) && report.recipients.length > 0
      ? report.recipients.map((recipient) => String(recipient).trim()).filter(Boolean)
      : [DEFAULT_DAILY_REPORT_RECIPIENT],
    lastSentDate: report.lastSentDate || '',
    lastSentAt: report.lastSentAt || '',
  }));
}

function isAutomaticReportDue(report, now = new Date()) {
  if (!report.active) return false;
  const parts = getDateTimePartsInTimezone(now, report.timezone);
  if (report.lastSentDate === parts.date) return false;

  const currentMinutes = (parts.hour * 60) + parts.minute;
  const targetMinutes = getTimeMinutes(report.sendTime);
  const minutesAfterTarget = currentMinutes - targetMinutes;

  return minutesAfterTarget >= 0 && minutesAfterTarget <= 20;
}

function formatCordobas(value = 0) {
  return `C$ ${normalizeAmount(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTimeInTimezone(value, timezone = 'America/Managua') {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  if (!date) return '';

  return new Intl.DateTimeFormat('es-NI', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function classifyDailyExpenseType(row = {}) {
  const type = normalizeComparableText(row.tipo || row.type || row.categoria || row.category);
  if (type.includes('compra')) return 'compra';
  if (type.includes('abono')) return 'abono';
  return 'gasto';
}

function getDailyExpenseBadge(type) {
  if (type === 'compra') return 'Compra';
  if (type === 'abono') return 'ABONO';
  return 'Gasto';
}

function calculateDailyExpenseTotals(rows = []) {
  return rows.reduce((totals, row) => {
    const amount = normalizeAmount(row.monto ?? row.amount);
    const type = classifyDailyExpenseType(row);

    if (type === 'compra') totals.compras += amount;
    else if (type === 'abono') totals.abonos += amount;
    else totals.gastos += amount;

    totals.total += amount;
    return totals;
  }, {
    gastos: 0,
    compras: 0,
    abonos: 0,
    total: 0,
  });
}

function truncateText(value, maxLength = 80) {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

async function getDailyExpenseRows(dateString, timezone = 'America/Managua') {
  const snapshot = await firestore
    .collection('gastosDiarios')
    .where('fecha', '==', dateString)
    .get();

  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data() || {};
      const timestamp = data.timestamp || data.createdAt || data.updatedAt;
      const timestampDate = timestamp?.toDate?.() || null;
      return {
        id: docSnapshot.id,
        ...data,
        amount: normalizeAmount(data.monto ?? data.amount),
        typeGroup: classifyDailyExpenseType(data),
        timeLabel: data.hora || data.time || formatTimeInTimezone(timestamp, timezone) || '--:--',
        sortTime: timestampDate ? timestampDate.getTime() : 0,
      };
    })
    .sort((left, right) => {
      if (right.sortTime !== left.sortTime) return right.sortTime - left.sortTime;
      return String(right.timeLabel).localeCompare(String(left.timeLabel));
    });
}

function drawPdfCard(doc, x, y, width, title, value, color) {
  doc
    .roundedRect(x, y, width, 54, 8)
    .fillAndStroke('#ffffff', '#d7e2e9');
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#8aa0ae')
    .text(title.toUpperCase(), x, y + 12, { width, align: 'center' });
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(color)
    .text(value, x, y + 28, { width, align: 'center' });
}

function drawDailyReportTableHeader(doc, y) {
  const columns = [
    { label: 'HORA', x: 36, width: 42, align: 'left' },
    { label: 'DESCRIPCION', x: 82, width: 180, align: 'left' },
    { label: 'TIPO', x: 266, width: 56, align: 'left' },
    { label: 'CATEGORIA', x: 326, width: 86, align: 'left' },
    { label: 'SUBCATEGORIA', x: 416, width: 86, align: 'left' },
    { label: 'MONTO', x: 506, width: 70, align: 'right' },
  ];

  doc.rect(36, y, 540, 24).fill('#edf3f6');
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#607888');
  columns.forEach((column) => {
    doc.text(column.label, column.x, y + 8, { width: column.width, align: column.align });
  });

  return y + 24;
}

function buildDailyExpensesPdf({ dateString, rows, totals, reportName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 612, 792).fill('#f7fbfd');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#8aa0ae')
      .text('REPORTE DE GASTOS DIARIOS', 36, 20, { characterSpacing: 1.2 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#16222d')
      .text('Carnes Amparito', 36, 34);
    doc.font('Helvetica').fontSize(9).fillColor('#607888')
      .text(`${reportName} - ${dateString}`, 36, 55);

    doc.roundedRect(418, 24, 158, 48, 10).fillAndStroke('#ffffff', '#d7e2e9');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#8aa0ae').text('FECHA', 434, 36);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#16222d').text(dateString, 434, 49);

    const cardY = 92;
    drawPdfCard(doc, 36, cardY, 126, 'Gastos', formatCordobas(totals.gastos), '#a81d24');
    drawPdfCard(doc, 174, cardY, 126, 'Compras', formatCordobas(totals.compras), '#c25a00');
    drawPdfCard(doc, 312, cardY, 126, 'Abonos', formatCordobas(totals.abonos), '#314155');
    drawPdfCard(doc, 450, cardY, 126, 'Total del dia', formatCordobas(totals.total), '#a81d24');

    let y = drawDailyReportTableHeader(doc, 168);
    const rowHeight = 26;

    if (rows.length === 0) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#607888')
        .text('No hay movimientos registrados para esta fecha.', 36, y + 18, { width: 540, align: 'center' });
      y += 58;
    } else {
      rows.forEach((row, index) => {
        if (y > 720) {
          doc.addPage({ size: 'LETTER', margin: 36 });
          doc.rect(0, 0, 612, 792).fill('#f7fbfd');
          y = drawDailyReportTableHeader(doc, 36);
        }

        doc.rect(36, y, 540, rowHeight).fill(index % 2 === 0 ? '#ffffff' : '#fbfdfe');
        doc.font('Helvetica').fontSize(8).fillColor('#314155');
        doc.text(row.timeLabel, 36, y + 8, { width: 42 });
        doc.text(truncateText(row.descripcion || row.description, 54), 82, y + 8, { width: 180 });

        doc.font('Helvetica-Bold').fontSize(7);
        const typeColor = row.typeGroup === 'compra' ? '#8b3df4' : row.typeGroup === 'abono' ? '#bf6b00' : '#c92a2a';
        doc.fillColor(typeColor).text(getDailyExpenseBadge(row.typeGroup), 266, y + 8, { width: 56 });

        doc.font('Helvetica').fontSize(8).fillColor('#314155');
        doc.text(truncateText(row.categoria || row.category || '-', 24), 326, y + 8, { width: 86 });
        doc.text(truncateText(row.subcategoria || row.subcategory || '-', 24), 416, y + 8, { width: 86 });
        doc.font('Helvetica-Bold').text(formatCordobas(row.amount), 506, y + 8, { width: 70, align: 'right' });
        y += rowHeight;
      });
    }

    doc.rect(36, y, 540, 30).fill('#edf3f6');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#314155').text('TOTAL DEL DIA', 46, y + 11);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#16222d')
      .text(formatCordobas(totals.total), 440, y + 9, { width: 136, align: 'right' });

    doc.font('Helvetica').fontSize(7).fillColor('#8aa0ae')
      .text('Generado automaticamente por Sistema Contable Carnes Amparito.', 36, 758, { width: 540, align: 'center' });

    doc.end();
  });
}

function buildDailyExpensesEmailHtml({ dateString, totals, rows }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#16222d">
      <h2 style="margin:0 0 8px">Reporte de gastos diarios - Carnes Amparito</h2>
      <p style="margin:0 0 16px;color:#607888">Fecha: <strong>${dateString}</strong></p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #d7e2e9">
        <tr><td><strong>Gastos</strong></td><td>${formatCordobas(totals.gastos)}</td></tr>
        <tr><td><strong>Compras</strong></td><td>${formatCordobas(totals.compras)}</td></tr>
        <tr><td><strong>Abonos</strong></td><td>${formatCordobas(totals.abonos)}</td></tr>
        <tr><td><strong>Total del dia</strong></td><td><strong>${formatCordobas(totals.total)}</strong></td></tr>
      </table>
      <p style="margin-top:16px;color:#607888">Movimientos incluidos: ${rows.length}. El PDF adjunto contiene el detalle completo.</p>
    </div>
  `;
}

async function sendDailyExpensesReport(report, dateString) {
  const rows = await getDailyExpenseRows(dateString, report.timezone);
  const totals = calculateDailyExpenseTotals(rows);
  const pdfBuffer = await buildDailyExpensesPdf({
    dateString,
    rows,
    totals,
    reportName: report.name,
  });

  const user = REPORT_EMAIL_USER.value();
  const pass = REPORT_EMAIL_PASSWORD.value();
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: report.recipients.join(', '),
    subject: `Reporte de gastos diarios Carnes Amparito - ${dateString}`,
    html: buildDailyExpensesEmailHtml({ dateString, totals, rows }),
    attachments: [{
      filename: `reporte-gastos-diarios-${dateString}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  await firestore.collection('reportesAutomaticosEnvios').add({
    reportId: report.id,
    reportName: report.name,
    reportType: report.type,
    date: dateString,
    recipients: report.recipients,
    rowCount: rows.length,
    totalAmount: totals.total,
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
  });

  return {
    rowCount: rows.length,
    totalAmount: totals.total,
  };
}

exports.sendAutomaticDailyExpensesReport = onSchedule(FUNCTION_OPTIONS, async () => {
  const configRef = firestore.doc(AUTOMATIC_REPORTS_CONFIG_REF);
  const configSnapshot = await configRef.get();
  const reports = normalizeAutomaticReportsConfig(configSnapshot.exists ? configSnapshot.data() : {});
  const now = new Date();
  let sentCount = 0;
  const nextReports = [...reports];

  for (const report of reports) {
    if (!isAutomaticReportDue(report, now)) continue;

    const dateString = getDateTimePartsInTimezone(now, report.timezone).date;

    try {
      if (report.type !== 'gastosDiarios') {
        logger.warn('Tipo de reporte automatico no soportado', {
          reportId: report.id,
          reportType: report.type,
        });
        continue;
      }

      const result = await sendDailyExpensesReport(report, dateString);
      sentCount += 1;

      const index = nextReports.findIndex((item) => item.id === report.id);
      if (index >= 0) {
        nextReports[index] = {
          ...nextReports[index],
          lastSentDate: dateString,
          lastSentAt: now.toISOString(),
        };
      }

      logger.info('Reporte automatico enviado', {
        reportId: report.id,
        reportName: report.name,
        date: dateString,
        recipients: report.recipients,
        ...result,
      });
    } catch (error) {
      logger.error('Error enviando reporte automatico', {
        reportId: report.id,
        reportName: report.name,
        date: dateString,
        error: error.message,
      });

      await firestore.collection('reportesAutomaticosEnvios').add({
        reportId: report.id,
        reportName: report.name,
        reportType: report.type,
        date: dateString,
        recipients: report.recipients,
        status: 'error',
        error: error.message || 'Error enviando reporte automatico.',
        sentAt: FieldValue.serverTimestamp(),
      });
    }
  }

  if (sentCount > 0 || !configSnapshot.exists) {
    await configRef.set({
      reports: nextReports,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  return { sentCount };
});
