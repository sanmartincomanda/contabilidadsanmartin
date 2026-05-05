const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const mysql = require('mysql2/promise');

admin.initializeApp();

const firestore = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const SICAR_DB_HOST = defineSecret('SICAR_DB_HOST');
const SICAR_DB_PORT = defineString('SICAR_DB_PORT', { default: '3306' });
const SICAR_DB_USER = defineSecret('SICAR_DB_USER');
const SICAR_DB_PASSWORD = defineSecret('SICAR_DB_PASSWORD');
const SICAR_DB_NAME = defineSecret('SICAR_DB_NAME');
const SICAR_INGRESOS_QUERY = defineSecret('SICAR_INGRESOS_QUERY');
const SICAR_SYNC_API_TOKEN = defineSecret('SICAR_SYNC_API_TOKEN');
const SICAR_BRANCH_ID = defineString('SICAR_BRANCH_ID', { default: 'amparito' });
const SICAR_BRANCH_NAME = defineString('SICAR_BRANCH_NAME', { default: 'CARNES AMPARITO' });
const SICAR_TIMEZONE = defineString('SICAR_TIMEZONE', { default: 'America/Managua' });

const BASE_FUNCTION_OPTIONS = {
  region: 'us-central1',
  timeoutSeconds: 120,
  memory: '256MiB',
};

const CALLABLE_FUNCTION_OPTIONS = {
  ...BASE_FUNCTION_OPTIONS,
  secrets: [
    SICAR_DB_HOST,
    SICAR_DB_USER,
    SICAR_DB_PASSWORD,
    SICAR_DB_NAME,
    SICAR_INGRESOS_QUERY,
  ],
};

const HTTP_FUNCTION_OPTIONS = {
  ...CALLABLE_FUNCTION_OPTIONS,
  secrets: [
    SICAR_DB_HOST,
    SICAR_DB_USER,
    SICAR_DB_PASSWORD,
    SICAR_DB_NAME,
    SICAR_INGRESOS_QUERY,
    SICAR_SYNC_API_TOKEN,
  ],
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const LIMITED_USER_EMAIL = 'adriandiazc95@gmail.com';

function assertValidDate(value, fieldName) {
  if (!DATE_REGEX.test(value || '')) {
    throw new HttpsError('invalid-argument', `El campo ${fieldName} debe tener formato YYYY-MM-DD.`);
  }
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  if (typeof value === 'string') return value.substring(0, 10);
  return '';
}

function normalizeAmount(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

function getBranchId() {
  return SICAR_BRANCH_ID.value();
}

function getBranchName() {
  return SICAR_BRANCH_NAME.value();
}

function getActorLabel(actorEmail) {
  return actorEmail || 'api';
}

function getSyncDocumentId(date) {
  return `sicar_${getBranchId()}_${date}`;
}

function getSyncKey(date) {
  return `sicar:${getBranchId()}:${date}`;
}

function buildQuery(connection, template, { startDate, endDate, branchName }) {
  return template
    .replace(/\{\{startDate\}\}/g, connection.escape(startDate))
    .replace(/\{\{endDate\}\}/g, connection.escape(endDate))
    .replace(/\{\{branchName\}\}/g, connection.escape(branchName));
}

function aggregateRowsByDate(rows) {
  const aggregated = new Map();

  for (const row of rows || []) {
    const date = normalizeDate(
      row.date ||
      row.fecha ||
      row.sale_date ||
      row.saleDate ||
      row.dia ||
      row.day
    );

    const amount = normalizeAmount(
      row.amount ??
      row.monto ??
      row.total ??
      row.ingreso ??
      row.importe
    );

    if (!date) {
      continue;
    }

    aggregated.set(date, normalizeAmount((aggregated.get(date) || 0) + amount));
  }

  return Array.from(aggregated.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, amount]) => ({ date, amount }));
}

async function fetchDailyIncomeRows({ startDate, endDate, branchName }) {
  const connection = await mysql.createConnection({
    host: SICAR_DB_HOST.value(),
    port: Number(SICAR_DB_PORT.value() || 3306),
    user: SICAR_DB_USER.value(),
    password: SICAR_DB_PASSWORD.value(),
    database: SICAR_DB_NAME.value(),
    charset: 'utf8mb4',
  });

  try {
    const sql = buildQuery(connection, SICAR_INGRESOS_QUERY.value(), {
      startDate,
      endDate,
      branchName,
    });

    const [rows] = await connection.query(sql);
    return aggregateRowsByDate(rows);
  } finally {
    await connection.end();
  }
}

async function writeSyncLog(summary) {
  await firestore.collection('sicar_sync_logs').add({
    ...summary,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function upsertDailyIncomes(entries, actorEmail) {
  const batch = firestore.batch();

  entries.forEach(({ date, amount }) => {
    const ref = firestore.collection('ingresos').doc(getSyncDocumentId(date));
    batch.set(ref, {
      date,
      month: date.substring(0, 7),
      amount,
      branch: getBranchId(),
      branchName: getBranchName(),
      source: 'sicar',
      sourceLabel: 'SICAR',
      sourceSystem: 'SICAR',
      sourceBranch: getBranchName(),
      syncKey: getSyncKey(date),
      syncedBy: getActorLabel(actorEmail),
      syncedAt: FieldValue.serverTimestamp(),
      is_conciled: false,
      timezone: SICAR_TIMEZONE.value(),
    }, { merge: true });
  });

  await batch.commit();
}

function buildResponse({ startDate, endDate, preview, actorEmail, entries }) {
  const totalAmount = entries.reduce((total, item) => total + item.amount, 0);

  return {
    ok: true,
    preview,
    startDate,
    endDate,
    branchId: getBranchId(),
    branchName: getBranchName(),
    syncedCount: entries.length,
    totalAmount: normalizeAmount(totalAmount),
    actor: getActorLabel(actorEmail),
    entries,
  };
}

async function executeSync({ startDate, endDate, preview, actorEmail }) {
  assertValidDate(startDate, 'startDate');
  assertValidDate(endDate, 'endDate');

  if (endDate < startDate) {
    throw new HttpsError('invalid-argument', 'endDate no puede ser menor que startDate.');
  }

  const entries = await fetchDailyIncomeRows({
    startDate,
    endDate,
    branchName: getBranchName(),
  });

  if (!preview) {
    await upsertDailyIncomes(entries, actorEmail);
  }

  const response = buildResponse({
    startDate,
    endDate,
    preview,
    actorEmail,
    entries,
  });

  await writeSyncLog({
    actor: response.actor,
    preview,
    startDate,
    endDate,
    branchId: response.branchId,
    branchName: response.branchName,
    syncedCount: response.syncedCount,
    totalAmount: response.totalAmount,
    status: 'ok',
  });

  return response;
}

function ensureAdminUser(auth) {
  const email = auth?.token?.email || '';

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesion para sincronizar ingresos.');
  }

  if (!email || email === LIMITED_USER_EMAIL) {
    throw new HttpsError('permission-denied', 'No tienes permisos para sincronizar ingresos.');
  }

  return email;
}

exports.syncSicarIngresosCarnesAmparito = onCall(CALLABLE_FUNCTION_OPTIONS, async (request) => {
  const actorEmail = ensureAdminUser(request.auth);
  const startDate = request.data?.startDate || request.data?.date;
  const endDate = request.data?.endDate || request.data?.date || startDate;
  const preview = normalizeBoolean(request.data?.preview);

  logger.info('Iniciando sincronizacion SICAR callable', {
    actorEmail,
    startDate,
    endDate,
    preview,
  });

  return executeSync({
    startDate,
    endDate,
    preview,
    actorEmail,
  });
});

exports.sicarIngresosApi = onRequest(HTTP_FUNCTION_OPTIONS, async (request, response) => {
  if (!['GET', 'POST'].includes(request.method)) {
    response.status(405).json({ ok: false, error: 'Metodo no permitido.' });
    return;
  }

  const providedToken = request.headers.authorization?.replace(/^Bearer\s+/i, '') || request.headers['x-api-key'];

  if (!providedToken || providedToken !== SICAR_SYNC_API_TOKEN.value()) {
    response.status(401).json({ ok: false, error: 'Token invalido.' });
    return;
  }

  const source = request.method === 'GET' ? request.query : request.body;
  const startDate = source.startDate || source.date;
  const endDate = source.endDate || source.date || startDate;
  const preview = normalizeBoolean(source.preview);

  try {
    const result = await executeSync({
      startDate,
      endDate,
      preview,
      actorEmail: 'api',
    });

    response.status(200).json(result);
  } catch (error) {
    logger.error('Error en sicarIngresosApi', error);

    const message = error instanceof HttpsError ? error.message : 'Error interno sincronizando SICAR.';
    const status = error instanceof HttpsError && error.code === 'invalid-argument' ? 400 : 500;

    await writeSyncLog({
      actor: 'api',
      preview,
      startDate,
      endDate,
      branchId: getBranchId(),
      branchName: getBranchName(),
      syncedCount: 0,
      totalAmount: 0,
      status: 'error',
      error: message,
    });

    response.status(status).json({ ok: false, error: message });
  }
});
