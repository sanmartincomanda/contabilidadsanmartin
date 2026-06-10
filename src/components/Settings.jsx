import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import CategoryManager from './CategoryManager';

const CONFIG_REF = doc(db, 'configuracion', 'reportesAutomaticos');
const DEFAULT_RECIPIENT = 'carnessanmartingranada@gmail.com';

const DEFAULT_AUTOMATIC_REPORTS = [
    {
        id: 'daily-expenses',
        name: 'Reporte diario de gastos',
        type: 'gastosDiarios',
        active: true,
        sendTime: '19:30',
        timezone: 'America/Managua',
        attachPdf: true,
        recipients: [DEFAULT_RECIPIENT],
    },
];

const tabs = [
    { id: 'usuarios', label: 'Usuarios', eyebrow: 'Proximamente' },
    { id: 'categorias', label: 'Categorias', eyebrow: 'Catalogo contable' },
    { id: 'reportes', label: 'Reportes automaticos', eyebrow: 'Correo y PDF' },
];

const reportTypeLabels = {
    gastosDiarios: 'Gastos diarios',
};

const splitRecipients = (value) => (
    String(value || '')
        .split(/[\n,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
);

const joinRecipients = (recipients = []) => recipients.join('\n');

const normalizeReports = (reports = []) => (
    reports.length > 0 ? reports : DEFAULT_AUTOMATIC_REPORTS
).map((report) => ({
    id: report.id || `report-${Date.now()}`,
    name: report.name || 'Reporte automatico',
    type: report.type || 'gastosDiarios',
    active: report.active !== false,
    sendTime: report.sendTime || '19:30',
    timezone: report.timezone || 'America/Managua',
    attachPdf: report.attachPdf !== false,
    recipients: Array.isArray(report.recipients) && report.recipients.length > 0
        ? report.recipients
        : [DEFAULT_RECIPIENT],
    lastSentDate: report.lastSentDate || '',
    lastSentAt: report.lastSentAt || '',
}));

const SettingsShell = ({ activeTab, onTabChange, children }) => (
    <div className="space-y-5">
        <div className="erp-panel overflow-hidden rounded-[24px]">
            <div className="erp-panel-header flex flex-wrap items-end justify-between gap-4 px-5 py-4">
                <div>
                    <div className="erp-page-title">Workspace settings</div>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Configuraciones</h1>
                </div>
                <span className="erp-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                    Sistema contable
                </span>
            </div>
        </div>

        <div className="erp-command-strip rounded-[24px] p-2">
            <div className="erp-mobile-tabs -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`erp-pressable flex shrink-0 flex-col rounded-2xl px-4 py-2.5 text-left ${
                            activeTab === tab.id
                                ? 'bg-[#152533] text-white shadow-[0_16px_26px_-18px_rgba(15,23,42,.8)]'
                                : 'text-[#55717f] hover:bg-white'
                        }`}
                    >
                        <span className="text-xs font-black uppercase tracking-[0.18em]">{tab.label}</span>
                        <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${activeTab === tab.id ? 'text-white/60' : 'text-[#8a9ba6]'}`}>
                            {tab.eyebrow}
                        </span>
                    </button>
                ))}
            </div>
        </div>

        {children}
    </div>
);

const UsersPlaceholder = () => (
    <div className="erp-panel erp-panel-hover rounded-[24px] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf4f8] text-2xl font-black text-[#173042]">
            U
        </div>
        <h2 className="mt-4 text-xl font-black text-[#16222d]">Usuarios</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-[#6b7f8c]">
            Proximamente podremos administrar permisos, roles y accesos desde esta seccion.
        </p>
    </div>
);

const AutomaticReportsSettings = () => {
    const [reports, setReports] = useState(DEFAULT_AUTOMATIC_REPORTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadConfig = async () => {
            setLoading(true);
            try {
                const snap = await getDoc(CONFIG_REF);
                if (!mounted) return;
                setReports(normalizeReports(snap.exists() ? snap.data().reports : DEFAULT_AUTOMATIC_REPORTS));
            } catch (error) {
                console.error('Error cargando reportes automaticos:', error);
                if (mounted) setReports(DEFAULT_AUTOMATIC_REPORTS);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadConfig();
        return () => { mounted = false; };
    }, []);

    const activeCount = useMemo(() => reports.filter((report) => report.active).length, [reports]);

    const updateReport = (id, patch) => {
        setReports((prev) => prev.map((report) => (
            report.id === id ? { ...report, ...patch } : report
        )));
    };

    const addReport = () => {
        setReports((prev) => [
            ...prev,
            {
                ...DEFAULT_AUTOMATIC_REPORTS[0],
                id: `daily-expenses-${Date.now()}`,
                name: `Reporte diario de gastos ${prev.length + 1}`,
                active: false,
            },
        ]);
    };

    const removeReport = (id) => {
        if (!window.confirm('Eliminar este reporte automatico?')) return;
        setReports((prev) => prev.filter((report) => report.id !== id));
    };

    const handleSave = async () => {
        const normalized = reports.map((report) => {
            const baseReport = normalizeReports([report])[0];
            const { recipientsText, ...reportToSave } = {
                ...baseReport,
                recipients: splitRecipients(report.recipientsText ?? joinRecipients(report.recipients)),
            };
            return reportToSave;
        });

        const invalid = normalized.find((report) => report.active && report.recipients.length === 0);
        if (invalid) {
            alert(`Agrega al menos un correo para "${invalid.name}".`);
            return;
        }

        setSaving(true);
        try {
            await setDoc(CONFIG_REF, {
                reports: normalized,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            setReports(normalized);
            alert('Reportes automaticos guardados.');
        } catch (error) {
            console.error('Error guardando reportes automaticos:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="erp-panel rounded-[24px] p-8 text-center text-sm font-semibold text-[#6b7f8c]">
                Cargando configuracion de reportes...
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="erp-panel overflow-hidden rounded-[24px]">
                <div className="erp-panel-header flex flex-wrap items-end justify-between gap-4 px-5 py-4">
                    <div>
                        <div className="erp-page-title">Automatizacion</div>
                        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#16222d]">Reportes automaticos por correo</h2>
                        <p className="mt-1 text-sm font-semibold text-[#6b7f8c]">
                            Envia PDF adjunto del reporte de gastos diarios segun la hora configurada.
                        </p>
                    </div>
                    <span className="erp-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                        {activeCount} activo{activeCount === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                    {reports.map((report) => {
                        const recipientsText = report.recipientsText ?? joinRecipients(report.recipients);

                        return (
                            <div key={report.id} className="erp-panel erp-panel-hover overflow-hidden rounded-[24px]">
                                <div className="erp-panel-header flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                    <div>
                                        <div className="erp-page-title">{reportTypeLabels[report.type] || 'Reporte'}</div>
                                        <h3 className="mt-1 text-lg font-black text-[#16222d]">{report.name}</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateReport(report.id, { active: !report.active })}
                                        className={`erp-pressable rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${
                                            report.active
                                                ? 'bg-[#1e7a4f] text-white'
                                                : 'border border-[#d7e2e9] bg-white text-[#6b7f8c]'
                                        }`}
                                    >
                                        {report.active ? 'Activo' : 'Pausado'}
                                    </button>
                                </div>

                                <div className="grid gap-4 p-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#607888]">Nombre</label>
                                        <input
                                            type="text"
                                            value={report.name}
                                            onChange={(event) => updateReport(report.id, { name: event.target.value })}
                                            className="erp-focus h-12 w-full rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-semibold text-[#16222d]"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#607888]">Tipo de reporte</label>
                                        <select
                                            value={report.type}
                                            onChange={(event) => updateReport(report.id, { type: event.target.value })}
                                            className="erp-focus h-12 w-full rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-semibold text-[#16222d]"
                                        >
                                            <option value="gastosDiarios">Gastos diarios</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#607888]">Hora Nicaragua</label>
                                        <input
                                            type="time"
                                            step="900"
                                            value={report.sendTime}
                                            onChange={(event) => updateReport(report.id, { sendTime: event.target.value })}
                                            className="erp-focus h-12 w-full rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-semibold text-[#16222d]"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#607888]">Zona horaria</label>
                                        <input
                                            type="text"
                                            value={report.timezone}
                                            readOnly
                                            className="h-12 w-full rounded-2xl border border-[#ccd7df] bg-[#f5f9fb] px-4 text-sm font-semibold text-[#607888]"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#607888]">Correos destino</label>
                                        <textarea
                                            value={recipientsText}
                                            onChange={(event) => updateReport(report.id, { recipientsText: event.target.value })}
                                            rows={3}
                                            placeholder="correo1@dominio.com&#10;correo2@dominio.com"
                                            className="erp-focus w-full rounded-2xl border border-[#ccd7df] bg-white px-4 py-3 text-sm font-semibold text-[#16222d]"
                                        />
                                        <p className="mt-2 text-xs font-semibold text-[#7b8d98]">Puedes separar correos por enter, coma o punto y coma.</p>
                                    </div>
                                    <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7e2e9] bg-[#f7fbfd] px-4 py-3">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#607888]">PDF adjunto</div>
                                            <div className="mt-1 text-sm font-semibold text-[#314755]">Formato similar al reporte de gastos diarios de la app.</div>
                                        </div>
                                        <span className="rounded-full bg-[#152533] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">Activado</span>
                                    </div>
                                    {report.lastSentDate && (
                                        <div className="md:col-span-2 rounded-2xl border border-[#d7e2e9] bg-white px-4 py-3 text-sm font-semibold text-[#607888]">
                                            Ultimo envio: <span className="font-black text-[#16222d]">{report.lastSentDate}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-[#d7e2e9] bg-[#fbfdfe] px-5 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => removeReport(report.id)}
                                        className="erp-pressable rounded-xl border border-[#f0c9cc] bg-[#fff7f7] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#a81d24]"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-4">
                    <div className="erp-panel rounded-[24px] p-5">
                        <div className="erp-page-title">Entrega actual</div>
                        <div className="mt-3 rounded-2xl bg-[#152533] p-4 text-white">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Hora</div>
                            <div className="mt-1 text-3xl font-black">7:30 PM</div>
                            <div className="mt-1 text-sm font-semibold text-white/70">America/Managua</div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-[#d7e2e9] bg-white p-4">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#607888]">Correo principal</div>
                            <div className="mt-1 break-all text-sm font-black text-[#16222d]">{DEFAULT_RECIPIENT}</div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={addReport}
                        className="erp-pressable flex h-12 w-full items-center justify-center rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-extrabold uppercase tracking-[0.16em] text-[#173042]"
                    >
                        Crear otro reporte
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="erp-pressable flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] px-4 text-sm font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_18px_32px_-18px_rgba(14,23,34,.72)] disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar configuracion'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Settings({ categories }) {
    const [activeTab, setActiveTab] = useState('reportes');

    return (
        <SettingsShell activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'usuarios' && <UsersPlaceholder />}
            {activeTab === 'categorias' && <CategoryManager categories={categories} />}
            {activeTab === 'reportes' && <AutomaticReportsSettings />}
        </SettingsShell>
    );
}
