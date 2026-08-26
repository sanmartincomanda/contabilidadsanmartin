import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmt } from '../constants';
import { normalizeExpenseAttachments } from '../services/expenseAttachments';
import { getPaymentMethodLabel } from '../services/creditCardLiabilities';

const VALUE_ALIASES = {
    date: ['fecha'],
    fecha: ['date'],
    description: ['descripcion', 'detalle'],
    descripcion: ['description', 'detalle'],
    amount: ['monto'],
    monto: ['amount'],
    supplier: ['proveedor'],
    proveedor: ['supplier'],
    invoiceNumber: ['numero', 'factura'],
    category: ['categoria'],
    categoria: ['category'],
    subcategory: ['subcategoria'],
    subcategoria: ['subcategory'],
};

const resolveValue = (item, key) => {
    const candidateKeys = [key, ...(VALUE_ALIASES[key] || [])];
    for (const candidateKey of candidateKeys) {
        const value = item?.[candidateKey];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
};

const formatDateTime = (value) => {
    try {
        const date = value?.toDate?.() || (value instanceof Date ? value : null);
        return date ? date.toLocaleString('es-NI') : String(value || '—');
    } catch {
        return String(value || '—');
    }
};

const formatValue = (key, field, value) => {
    if (value === '' || value === undefined || value === null) return '—';
    if (field?.type === 'currency' || key === 'amount' || key === 'monto') return fmt(Number(value) || 0);
    if (key === 'paymentMethod') return getPaymentMethodLabel(value);
    if (key === 'paymentType') return String(value).toLowerCase() === 'credito' ? 'Crédito' : 'Contado';
    if (key === 'timestamp' || value?.toDate) return formatDateTime(value);
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return '—';
    return String(value);
};

export default function TransactionDetailModal({ item, type = 'Movimiento', fields = {}, onClose }) {
    const attachments = useMemo(() => normalizeExpenseAttachments(item || {}), [item]);
    const [selectedPhoto, setSelectedPhoto] = useState(0);

    useEffect(() => {
        setSelectedPhoto(0);
    }, [item?.id]);

    useEffect(() => {
        if (!item) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [item, onClose]);

    if (!item || typeof document === 'undefined') return null;

    const detailFields = Object.entries(fields)
        .filter(([, field]) => field?.type !== 'attachments')
        .map(([key, field]) => ({
            key,
            label: field?.label || key,
            value: formatValue(key, field, resolveValue(item, key)),
        }));
    const description = resolveValue(item, 'description') || resolveValue(item, 'descripcion');
    const date = resolveValue(item, 'date') || resolveValue(item, 'fecha');
    const amount = resolveValue(item, 'amount') || resolveValue(item, 'monto');
    const activeAttachment = attachments[selectedPhoto] || attachments[0];

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="transaction-detail-title"
                className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#102847] px-5 py-4 text-white sm:px-6">
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">Detalle del registro</div>
                        <h2 id="transaction-detail-title" className="mt-1 text-xl font-black">{type}</h2>
                        <p className="mt-1 truncate text-sm text-slate-300">{description || 'Sin descripción'}{date ? ` · ${date}` : ''}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl leading-none transition hover:bg-white/20"
                        aria-label="Cerrar detalle"
                        autoFocus
                    >
                        ×
                    </button>
                </header>

                <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)] lg:overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-100 p-4 sm:p-6 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Comprobante</div>
                                <div className="mt-1 text-xs text-slate-500">{attachments.length ? `${attachments.length} foto${attachments.length === 1 ? '' : 's'} adjunta${attachments.length === 1 ? '' : 's'}` : 'Sin fotos adjuntas'}</div>
                            </div>
                            {activeAttachment && (
                                <a
                                    href={activeAttachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50"
                                >
                                    Abrir original
                                </a>
                            )}
                        </div>

                        {activeAttachment ? (
                            <>
                                <a
                                    href={activeAttachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-h-[430px]"
                                    title="Abrir foto en tamaño original"
                                >
                                    <img
                                        src={activeAttachment.url}
                                        alt={`Comprobante ${selectedPhoto + 1}`}
                                        className="max-h-[58vh] w-full object-contain"
                                    />
                                </a>
                                {attachments.length > 1 && (
                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                        {attachments.map((attachment, index) => (
                                            <button
                                                key={attachment.id || attachment.path || attachment.url || index}
                                                type="button"
                                                onClick={() => setSelectedPhoto(index)}
                                                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${selectedPhoto === index ? 'border-sky-600 ring-2 ring-sky-200' : 'border-slate-200'}`}
                                                aria-label={`Ver comprobante ${index + 1}`}
                                            >
                                                <img src={attachment.url} alt="" className="h-full w-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 text-center">
                                <svg className="h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h3l1.5-2h7L17 7h3v12H4V7Zm8 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                                </svg>
                                <div className="mt-3 font-bold text-slate-600">Este registro no tiene foto</div>
                                <div className="mt-1 text-xs text-slate-400">Puede agregarla usando la opción Editar del historial.</div>
                            </div>
                        )}
                    </div>

                    <div className="p-5 sm:p-6 lg:overflow-y-auto">
                        <div className="rounded-2xl border border-[#b8d9ef] bg-[#f4faff] p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#39759a]">Monto registrado</div>
                            <div className="mt-1 font-mono text-3xl font-black text-[#102847]">{fmt(Number(amount) || 0)}</div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            {detailFields.map((detail) => (
                                <div key={detail.key} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{detail.label}</div>
                                    <div className="mt-1 break-words text-sm font-semibold text-slate-800">{detail.value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
                            ID del registro: <span className="font-mono">{item.id || '—'}</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>,
        document.body
    );
}
