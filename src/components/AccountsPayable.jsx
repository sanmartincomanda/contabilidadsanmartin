// src/components/AccountsPayable.jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
    collection, addDoc, doc, Timestamp, runTransaction, writeBatch,
    query, orderBy, limit, getDocs, deleteDoc
} from 'firebase/firestore';
import { DEFAULT_BRANCH_ID, DEFAULT_BRANCH_NAME, fmt } from '../constants';
import { deletePayableTransaction } from '../services/linkedTransactions';
import { getLocalDateString } from '../utils/localDate';
import {
    CASH_PAYMENT_METHOD,
    PAYABLE_PAYMENT_METHOD_OPTIONS,
    TRANSFER_PAYMENT_METHOD,
    buildCreditCardCharge,
    getCreditCardMovementRef,
    getPaymentMethodLabel,
    isCreditCardPayment,
} from '../services/creditCardLiabilities';

// --- ICONOS SVG INLINE ---
const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const Icons = {
    plus: "M12 4v16m8-8H4",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    creditCard: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    fileText: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    alertCircle: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    checkCircle: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    x: "M6 18L18 6M6 6l12 12",
    chevronRight: "M9 5l7 7-7 7",
    trendingDown: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    arrowRightCircle: "M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z",
    calculator: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    square: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z",
    search: "M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z",
    filter: "M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6l-5.8 7.73V19a1 1 0 01-.55.9l-4 2A1 1 0 019 21v-8.67L3.2 4.6A1 1 0 013 4z"
};

// --- ANIMACIONES ---
const FadeIn = ({ children, delay = 0, className = "" }) => (
    <div
        className={`animate-fade-in ${className}`}
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
        {children}
    </div>
);

const SlideIn = ({ children, className = "" }) => (
    <div className={`animate-slide-in ${className}`}>{children}</div>
);

// --- COMPONENTES UI ---
const Card = ({ title, children, className = "", right, icon, onHeaderDoubleClick, headerClassName = "" }) => (
    <div className={`erp-panel erp-panel-hover rounded-[24px] overflow-hidden ${className}`}>
        <div
            className={`erp-panel-header flex justify-between items-center px-5 py-3.5 border-b border-[#c5dce7] ${headerClassName}`}
            onDoubleClick={onHeaderDoubleClick}
        >
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="rounded-xl bg-[#eaf7fc] p-2">
                        <Icon path={Icons[icon]} className="w-4 h-4 text-[#0a628f]" />
                    </div>
                )}
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7784]">{title}</h3>
            </div>
            {right}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Button = ({ children, variant = 'primary', className = '', disabled, ...props }) => {
    const variants = {
        primary:   'bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] text-white shadow-[0_16px_28px_-18px_rgba(15,23,42,.78)] hover:brightness-[1.04]',
        danger:    'bg-red-600 hover:bg-red-700 text-white',
        success:   'bg-emerald-600 hover:bg-emerald-700 text-white',
        ghost:     'bg-white hover:bg-[#f3f9fc] text-[#45606d] border border-[#c5dce7]',
        outline:   'bg-white border border-[#c5dce7] hover:border-[#0a628f] text-[#34515f] hover:text-[#0a628f]',
        secondary: 'bg-[#eef7fb] hover:bg-[#dff0f7] text-[#34515f]'
    };
    return (
        <button
            disabled={disabled}
            className={`erp-pressable px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Input = ({ label, icon, className = '', ...props }) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-semibold uppercase tracking-widest text-[#61727f]">{label}</label>}
        <div className="relative group">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72909d] group-focus-within:text-[#0a628f] transition-colors" />}
            <input
                className={`w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-medium text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12 ${icon ? 'pl-10' : ''} ${className}`}
                {...props}
            />
        </div>
    </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-semibold uppercase tracking-widest text-[#61727f]">{label}</label>}
        <div className="relative">
            <select
                className="w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-medium text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12 appearance-none cursor-pointer pr-8"
                {...props}
            >
                {options}
            </select>
            <Icon path={Icons.chevronRight} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72909d] rotate-90 pointer-events-none" />
        </div>
    </div>
);

const Badge = ({ children, variant = 'default' }) => {
    const variants = {
        default: 'bg-slate-100 text-slate-600',
        danger:  'bg-red-50 text-red-700 border border-red-200',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        info:    'bg-sky-50 text-sky-700 border border-sky-200',
        purple:  'bg-violet-50 text-violet-700 border border-violet-200'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${variants[variant]}`}>
            {children}
        </span>
    );
};

const Spinner = () => (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

const AbonoDetalle = ({ detalle, fmt, compact = false }) => {
    if (!detalle.length) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                Este abono no tiene detalle de facturas guardado.
            </div>
        );
    }

    if (compact) {
        return (
            <div className="mt-3 space-y-2 rounded-2xl border border-[#d7e2e9] bg-[#f7fbfd] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#607888]">
                    Facturas pagadas
                </div>
                {detalle.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#d7e2e9] bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="break-all font-mono text-xs font-black text-[#16222d]">#{item.numero}</div>
                                {item.fecha && <div className="mt-1 text-[10px] font-semibold text-slate-400">Emision: {item.fecha}</div>}
                            </div>
                            <div className="erp-mono text-sm font-black text-emerald-600">{fmt(item.montoAbonado)}</div>
                        </div>
                        {item.montoFactura !== undefined && (
                            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[#607888]">
                                <span>Monto factura</span>
                                <span className="erp-mono">{fmt(item.montoFactura)}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-[#d7e2e9] bg-[#f7fbfd] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#607888]">
                    Facturas pagadas
                </div>
                <div className="text-xs font-semibold text-slate-400">{detalle.length} factura{detalle.length === 1 ? '' : 's'}</div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            {['Factura', 'Emision', 'Monto factura', 'Abono aplicado', 'Saldo actual'].map((heading) => (
                                <th key={heading} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${heading.includes('Monto') || heading.includes('Abono') || heading.includes('Saldo') ? 'text-right' : 'text-left'}`}>
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {detalle.map((item) => (
                            <tr key={item.id}>
                                <td className="px-3 py-2 font-mono font-bold text-[#16222d]">#{item.numero}</td>
                                <td className="px-3 py-2 text-slate-500">{item.fecha || '-'}</td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-600">{item.montoFactura !== undefined ? fmt(item.montoFactura) : '-'}</td>
                                <td className="px-3 py-2 text-right font-black text-emerald-600">{fmt(item.montoAbonado)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-[#a81d24]">{item.saldoActual !== undefined ? fmt(item.saldoActual) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const useCompactViewport = (breakpoint = 1023) => {
    const getMatches = () => (
        typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
    );

    const [isCompact, setIsCompact] = useState(getMatches);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const media = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const sync = (event) => setIsCompact(event.matches);

        setIsCompact(media.matches);

        if (media.addEventListener) {
            media.addEventListener('change', sync);
            return () => media.removeEventListener('change', sync);
        }

        media.addListener(sync);
        return () => media.removeListener(sync);
    }, [breakpoint]);

    return isCompact;
};

const emptyPayableFilters = {
    proveedor: '',
    fechaDesde: '',
    fechaHasta: '',
};

const invoiceStatusOptions = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'pagada', label: 'Pagadas' },
    { value: 'vencida', label: 'Vencidas' },
    { value: 'vigente', label: 'Vigentes' },
];

const normalizeFilterText = (value) => (
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
);

const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

const getTodayStart = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

const matchesProviderFilter = (provider, filterValue) => {
    const needle = normalizeFilterText(filterValue);
    if (!needle) return true;
    return normalizeFilterText(provider).includes(needle);
};

const isDateInRange = (dateValue, from, to) => {
    const date = String(dateValue || '').slice(0, 10);
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
};

const hasActivePayableFilters = (filters) => (
    Boolean(filters.proveedor || filters.fechaDesde || filters.fechaHasta)
);

const getPayableInvoiceStatus = (factura) => {
    const saldo = Number(factura.saldo || 0);
    if (factura.estado === 'pagado' || saldo <= 0) {
        return { status: 'pagada', label: 'Pagada', variant: 'success' };
    }

    const vencimiento = parseLocalDate(factura.vencimiento);
    if (vencimiento && vencimiento < getTodayStart()) {
        return { status: 'vencida', label: 'Vencida', variant: 'danger' };
    }

    return { status: 'vigente', label: factura.estado === 'parcial' ? 'Vigente parcial' : 'Vigente', variant: 'info' };
};

const getInvoicePaidAmount = (factura) => (
    Number((Number(factura.monto || 0) - Number(factura.saldo || 0)).toFixed(2))
);

const toInvoiceView = (factura) => ({
    ...factura,
    yaAbonado: getInvoicePaidAmount(factura),
    statusInfo: getPayableInvoiceStatus(factura),
});

// --- COMPONENTE PRINCIPAL ---
export function AccountsPayable({ data }) {
    const isCompactViewport = useCompactViewport();
    const [activeTab, setActiveTab] = useState('Estado de Cuenta');
    const [loading, setLoading] = useState(false);
    const [nuevoProveedor, setNuevoProveedor] = useState('');
    const [expandedProvider, setExpandedProvider] = useState(null);
    const [estadoCuentaFilters, setEstadoCuentaFilters] = useState(emptyPayableFilters);
    const [abonosFilters, setAbonosFilters] = useState(emptyPayableFilters);
    const [facturasHistoryFilters, setFacturasHistoryFilters] = useState({
        ...emptyPayableFilters,
        estado: 'todos',
        factura: '',
    });
    const [expandedAbonoId, setExpandedAbonoId] = useState(null);

    // Ref para bloquear doble-submit en cualquier operación crítica
    const isProcessingRef = useRef(false);

    const facturas = useMemo(() => {
        return (data.cuentas_por_pagar || []).map((factura) => ({
            ...factura,
            branch: DEFAULT_BRANCH_ID,
            branchName: DEFAULT_BRANCH_NAME,
            paymentType: factura.paymentType || 'credito',
        }));
    }, [data.cuentas_por_pagar]);

    const abonos = data.abonos_pagar || [];
    const listaProveedores = data.proveedores || [];

    const [facturaForm, setFacturaForm] = useState({
        fecha: getLocalDateString(),
        proveedor: '',
        numero: '',
        vencimiento: '',
        monto: ''
    });

    // --- CÁLCULOS MEMOIZADOS ---
    const { facturasPorProveedor, saldoTotalGeneral, stats } = useMemo(() => {
        const groups = {};
        let totalGeneral = 0;
        let vencidas = 0;
        let porVencer = 0;
        const hoy = getTodayStart();

        const facturasOrdenadas = [...facturas]
            .filter(f => (
                f.estado !== 'pagado'
                && Number(f.saldo || 0) > 0
                && matchesProviderFilter(f.proveedor, estadoCuentaFilters.proveedor)
                && isDateInRange(f.fecha, estadoCuentaFilters.fechaDesde, estadoCuentaFilters.fechaHasta)
            ))
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        facturasOrdenadas.forEach(f => {
            if (!groups[f.proveedor]) groups[f.proveedor] = { saldoTotal: 0, items: [] };
            const invoiceView = toInvoiceView(f);
            groups[f.proveedor].items.push(invoiceView);
            groups[f.proveedor].saldoTotal += (f.saldo || 0);
            totalGeneral += (f.saldo || 0);

            if (f.vencimiento) {
                const venc = parseLocalDate(f.vencimiento);
                const diff = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
                if (diff < 0) vencidas += f.saldo || 0;
                else if (diff <= 3) porVencer += f.saldo || 0;
            }
        });

        return {
            facturasPorProveedor: groups,
            saldoTotalGeneral: totalGeneral,
            stats: { vencidas, porVencer, count: facturasOrdenadas.length }
        };
    }, [estadoCuentaFilters, facturas]);

    const providerEntries = useMemo(() => (
        Object.entries(facturasPorProveedor).sort(([left], [right]) => left.localeCompare(right))
    ), [facturasPorProveedor]);

    const abonosFiltrados = useMemo(() => (
        [...abonos]
            .filter((abono) => (
                matchesProviderFilter(abono.proveedor, abonosFilters.proveedor)
                && isDateInRange(abono.fecha, abonosFilters.fechaDesde, abonosFilters.fechaHasta)
            ))
            .sort((a, b) => {
                const sequenceDiff = Number(b.secuencia || 0) - Number(a.secuencia || 0);
                if (sequenceDiff !== 0) return sequenceDiff;
                return String(b.fecha || '').localeCompare(String(a.fecha || ''));
            })
    ), [abonos, abonosFilters]);

    const historialFacturasCredito = useMemo(() => {
        const facturaNeedle = normalizeFilterText(facturasHistoryFilters.factura);

        return facturas
            .map(toInvoiceView)
            .filter((factura) => {
                const matchesStatus = facturasHistoryFilters.estado === 'todos'
                    || factura.statusInfo.status === facturasHistoryFilters.estado;
                const matchesFactura = !facturaNeedle
                    || normalizeFilterText(factura.numero).includes(facturaNeedle);

                return matchesStatus
                    && matchesFactura
                    && matchesProviderFilter(factura.proveedor, facturasHistoryFilters.proveedor)
                    && isDateInRange(factura.fecha, facturasHistoryFilters.fechaDesde, facturasHistoryFilters.fechaHasta);
            })
            .sort((a, b) => {
                const dateDiff = String(b.fecha || '').localeCompare(String(a.fecha || ''));
                if (dateDiff !== 0) return dateDiff;
                return String(a.proveedor || '').localeCompare(String(b.proveedor || ''));
            });
    }, [facturas, facturasHistoryFilters]);

    const historialFacturasStats = useMemo(() => (
        historialFacturasCredito.reduce((acc, factura) => {
            acc.total += Number(factura.monto || 0);
            acc.saldo += Number(factura.saldo || 0);
            acc[factura.statusInfo.status] += 1;
            return acc;
        }, { total: 0, saldo: 0, pagada: 0, vencida: 0, vigente: 0 })
    ), [historialFacturasCredito]);

    const totalAbonosFiltrados = useMemo(() => (
        abonosFiltrados.reduce((sum, abono) => sum + Number(abono.montoTotal || 0), 0)
    ), [abonosFiltrados]);

    const facturasById = useMemo(() => (
        facturas.reduce((acc, factura) => {
            acc[factura.id] = toInvoiceView(factura);
            return acc;
        }, {})
    ), [facturas]);

    const getAbonoDetalleFacturas = useCallback((abono) => (
        (abono.detalleAfectado || []).map((detalle, index) => {
            const factura = facturasById[detalle.id] || {};
            return {
                id: detalle.id || `detalle-${index}`,
                numero: factura.numero || detalle.numero || detalle.invoiceNumber || detalle.id || 'S/N',
                proveedor: factura.proveedor || abono.proveedor,
                fecha: factura.fecha || '',
                vencimiento: factura.vencimiento || '',
                montoFactura: factura.monto,
                saldoActual: factura.saldo,
                estadoActual: factura.statusInfo,
                montoAbonado: Number(detalle.montoAbonado || 0),
            };
        })
    ), [facturasById]);

    // --- HANDLERS ---
    const handleSaveFactura = useCallback(async (e) => {
        e.preventDefault();
        const montoNum = parseFloat(facturaForm.monto);
        if (!facturaForm.proveedor || isNaN(montoNum) || montoNum <= 0) {
            return alert("Por favor complete Proveedor y Monto.");
        }

        setLoading(true);
        try {
            const facturaRef = doc(collection(db, 'cuentas_por_pagar'));
            const compraRef = doc(collection(db, 'compras'), `credito_${facturaRef.id}`);
            const batch = writeBatch(db);

            batch.set(facturaRef, {
                fecha: facturaForm.fecha,
                month: facturaForm.fecha.substring(0, 7),
                proveedor: facturaForm.proveedor,
                sucursal: DEFAULT_BRANCH_NAME,
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                numero: facturaForm.numero?.trim() || "S/N",
                vencimiento: facturaForm.vencimiento || "",
                monto: montoNum,
                saldo: montoNum,
                estado: 'pendiente',
                paymentType: 'credito',
                isInventoryCost: true,
                mirroredToCompras: true,
                mirroredPurchaseId: compraRef.id,
                timestamp: Timestamp.now()
            });

            batch.set(compraRef, {
                date: facturaForm.fecha,
                month: facturaForm.fecha.substring(0, 7),
                supplier: facturaForm.proveedor,
                invoiceNumber: facturaForm.numero?.trim() || "S/N",
                amount: montoNum,
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                paymentType: 'credito',
                isInventoryCost: true,
                sourceCollection: 'cuentas_por_pagar',
                sourceFacturaId: facturaRef.id,
                linkedPayableId: facturaRef.id,
                timestamp: Timestamp.now()
            });

            await batch.commit();
            setFacturaForm(prev => ({ ...prev, numero: '', monto: '', vencimiento: '' }));
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        } finally {
            setLoading(false);
        }
    }, [facturaForm]);

    // --- MODAL ABONOS ---
    const [showModalAbono, setShowModalAbono] = useState(false);
    const [selectedFacturas, setSelectedFacturas] = useState([]);
    const [montoAbono, setMontoAbono] = useState('');
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
    const [montoPrevisualizado, setMontoPrevisualizado] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState(TRANSFER_PAYMENT_METHOD);

    const resetAbonoDraft = useCallback((nextProveedor = '') => {
        setProveedorSeleccionado(nextProveedor);
        setSelectedFacturas([]);
        setMontoAbono('');
        setMontoPrevisualizado(0);
        setPaymentMethod(TRANSFER_PAYMENT_METHOD);
    }, []);

    const closeModalAbono = useCallback(() => {
        setShowModalAbono(false);
        resetAbonoDraft('');
    }, [resetAbonoDraft]);

    const openModalAbono = useCallback((proveedor) => {
        resetAbonoDraft(proveedor);
        setShowModalAbono(true);
    }, [resetAbonoDraft]);

    useEffect(() => {
        const items = facturasPorProveedor[proveedorSeleccionado]?.items || [];
        const total = items
            .filter(f => selectedFacturas.includes(f.id))
            .reduce((sum, f) => sum + (f.saldo || 0), 0);
        setMontoPrevisualizado(total);
    }, [selectedFacturas, proveedorSeleccionado, facturasPorProveedor]);

    const handleSeleccionarTodas = () => {
        const items = facturasPorProveedor[proveedorSeleccionado]?.items || [];
        const allIds = items.map(f => f.id);
        setSelectedFacturas(selectedFacturas.length === allIds.length ? [] : allIds);
    };

    const handleAbonarMontoSeleccionado = () => {
        setMontoAbono(montoPrevisualizado.toFixed(2));
    };

    // Guard ref: previene doble-submit antes de que React deshabilite el botón via estado
    const handleRealizarAbono = useCallback(async () => {
        if (isProcessingRef.current) return;

        const montoTotalAbono = Number(parseFloat(montoAbono).toFixed(2));
        if (isNaN(montoTotalAbono) || montoTotalAbono <= 0 || selectedFacturas.length === 0) return;

        isProcessingRef.current = true;
        setLoading(true);
        try {
            const fechaAbono = getLocalDateString();
            const q = query(collection(db, 'abonos_pagar'), orderBy('secuencia', 'desc'), limit(1));
            const snap = await getDocs(q);
            const nuevaSecuencia = snap.empty ? 1 : (snap.docs[0].data().secuencia + 1);
            const abonoRef = doc(collection(db, 'abonos_pagar'));
            const gastoDiarioRef = paymentMethod === CASH_PAYMENT_METHOD ? doc(collection(db, 'gastosDiarios')) : null;
            const creditCardMovementRef = isCreditCardPayment(paymentMethod)
                ? getCreditCardMovementRef('abonos_pagar', abonoRef.id)
                : null;

            await runTransaction(db, async (transaction) => {
                let restante = montoTotalAbono;
                const facturasAfectadas = [];
                const refsYDocs = [];

                for (const fId of selectedFacturas) {
                    const ref = doc(db, 'cuentas_por_pagar', fId);
                    const snapshot = await transaction.get(ref);
                    if (!snapshot.exists()) throw new Error('Una factura no existe');
                    refsYDocs.push({ ref, snapshot, data: snapshot.data() });
                }

                refsYDocs.sort((a, b) => new Date(a.data.fecha) - new Date(b.data.fecha));

                for (const item of refsYDocs) {
                    if (restante <= 0) break;
                    const saldoActual = Number(item.data.saldo || 0);
                    if (saldoActual <= 0) {
                        throw new Error(`La factura ${item.data.numero || item.snapshot.id} ya no tiene saldo pendiente. Actualiza la pantalla antes de abonar.`);
                    }

                    const pagoParaEstaFactura = Number(Math.min(saldoActual, restante).toFixed(2));
                    const nuevoSaldo = Number((saldoActual - pagoParaEstaFactura).toFixed(2));
                    transaction.update(item.ref, {
                        saldo: nuevoSaldo,
                        estado: nuevoSaldo <= 0 ? 'pagado' : 'parcial'
                    });
                    facturasAfectadas.push({ id: item.snapshot.id, montoAbonado: pagoParaEstaFactura });
                    restante = Number((restante - pagoParaEstaFactura).toFixed(2));
                }

                const montoAplicado = Number((montoTotalAbono - restante).toFixed(2));
                if (facturasAfectadas.length === 0 || montoAplicado <= 0) {
                    throw new Error('No se aplico ningun monto a facturas pendientes. Actualiza la pantalla e intenta de nuevo.');
                }
                if (Math.abs(montoAplicado - montoTotalAbono) > 0.009) {
                    throw new Error(`El abono de ${fmt(montoTotalAbono)} supera el saldo seleccionado. Solo hay ${fmt(montoAplicado)} disponible.`);
                }

                transaction.set(abonoRef, {
                    fecha: fechaAbono,
                    montoTotal: montoAplicado,
                    proveedor: proveedorSeleccionado,
                    secuencia: nuevaSecuencia,
                    paymentMethod,
                    linkedGastoDiarioId: gastoDiarioRef?.id || null,
                    linkedCreditCardMovementId: creditCardMovementRef?.id || null,
                    detalleAfectado: facturasAfectadas,
                    timestamp: Timestamp.now()
                });

                if (gastoDiarioRef) {
                    transaction.set(gastoDiarioRef, {
                        fecha: fechaAbono,
                        caja: 'Caja Carnes Amparito',
                        descripcion: `ABONO A PROVEEDOR ${proveedorSeleccionado}`,
                        monto: montoAplicado,
                        tipo: 'ABONO',
                        categoria: 'ABONO',
                        sucursal: DEFAULT_BRANCH_ID,
                        branch: DEFAULT_BRANCH_ID,
                        branchName: DEFAULT_BRANCH_NAME,
                        origen: 'abonos_pagar',
                        linkedAbonoId: abonoRef.id,
                        paymentMethod,
                        timestamp: Timestamp.now()
                    });
                }

                if (creditCardMovementRef) {
                    transaction.set(creditCardMovementRef, buildCreditCardCharge({
                        sourceCollection: 'abonos_pagar',
                        sourceId: abonoRef.id,
                        sourceType: 'Abono proveedor',
                        date: fechaAbono,
                        description: `ABONO A PROVEEDOR ${proveedorSeleccionado}`,
                        amount: montoAplicado,
                        category: 'ABONO',
                        subcategory: 'ABONO',
                        provider: proveedorSeleccionado,
                        paymentMethod,
                    }), { merge: true });
                }
            });

            closeModalAbono();
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            isProcessingRef.current = false;
            setLoading(false);
        }
    }, [closeModalAbono, montoAbono, paymentMethod, selectedFacturas, proveedorSeleccionado]);

    const handleDeleteAbono = useCallback(async (abonoDoc) => {
        if (isProcessingRef.current) return;
        if (!window.confirm(`¿Anular abono #${abonoDoc.secuencia}?`)) return;

        isProcessingRef.current = true;
        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const abonoRef = doc(db, 'abonos_pagar', abonoDoc.id);
                const abonoSnap = await transaction.get(abonoRef);
                if (!abonoSnap.exists()) {
                    throw new Error('Este abono ya fue anulado. Actualiza la pantalla.');
                }
                const currentAbono = { id: abonoDoc.id, ...abonoSnap.data() };
                const facturasParaActualizar = [];
                for (const item of currentAbono.detalleAfectado || []) {
                    const fRef = doc(db, 'cuentas_por_pagar', item.id);
                    const fDoc = await transaction.get(fRef);
                    if (fDoc.exists()) {
                        facturasParaActualizar.push({ ref: fRef, snapshot: fDoc, abonado: item.montoAbonado });
                    }
                }
                for (const fObj of facturasParaActualizar) {
                    const dataF = fObj.snapshot.data();
                    const nuevoSaldo = Number((dataF.saldo + fObj.abonado).toFixed(2));
                    transaction.update(fObj.ref, {
                        saldo: nuevoSaldo,
                        estado: nuevoSaldo >= dataF.monto ? 'pendiente' : 'parcial'
                    });
                }
                if (currentAbono.paymentMethod === CASH_PAYMENT_METHOD && currentAbono.linkedGastoDiarioId) {
                    transaction.delete(doc(db, 'gastosDiarios', currentAbono.linkedGastoDiarioId));
                }
                if (isCreditCardPayment(currentAbono.paymentMethod)) {
                    transaction.delete(getCreditCardMovementRef('abonos_pagar', currentAbono.id));
                }
                transaction.delete(abonoRef);
            });
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            isProcessingRef.current = false;
            setLoading(false);
        }
    }, []);

    const handleDeleteFactura = useCallback(async (factura) => {
        if (isProcessingRef.current) return;
        if (!window.confirm('¿Eliminar esta factura y su compra vinculada?')) return;

        isProcessingRef.current = true;
        setLoading(true);
        try {
            const result = await deletePayableTransaction(factura.id);
            if (result?.blocked) {
                const abonosLabel = (result.blockingAbonos || [])
                    .map(a => `#${a.secuencia || a.id}`)
                    .join(', ');
                alert(`No se puede eliminar: tiene abono(s) ${abonosLabel}. Anulalos primero desde Historial Abonos.`);
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            isProcessingRef.current = false;
            setLoading(false);
        }
    }, []);

    const toggleProviderExpanded = useCallback((providerName) => {
        setExpandedProvider((prev) => prev === providerName ? null : providerName);
    }, []);

    const handleAddProveedor = useCallback(async (e) => {
        e.preventDefault();
        if (!nuevoProveedor.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'proveedores'), { nombre: nuevoProveedor.trim().toUpperCase() });
            setNuevoProveedor('');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [nuevoProveedor]);

    // --- HELPERS ---
    const getVencimientoInfo = (fechaVenc) => {
        if (!fechaVenc) return { text: 'Sin vencimiento', variant: 'default' };
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const venc = new Date(fechaVenc);
        const diffDays = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { text: `${Math.abs(diffDays)}d vencida`, variant: 'danger' };
        if (diffDays === 0) return { text: 'Vence hoy', variant: 'warning' };
        if (diffDays <= 3) return { text: `${diffDays}d por vencer`, variant: 'warning' };
        return { text: `${diffDays} días`, variant: 'success' };
    };

    const tabs = [
        { id: 'Ingresar Factura',    icon: 'plus',         label: 'Nueva Factura' },
        { id: 'Estado de Cuenta',    icon: 'trendingDown',  label: 'Estado de Cuenta' },
        { id: 'Historial Abonos',    icon: 'receipt',       label: 'Historial Abonos' },
        { id: 'Historial Facturas',  icon: 'fileText',      label: 'Historial Facturas' },
        { id: 'Base de Proveedores', icon: 'users',         label: 'Proveedores' }
    ];

    return (
        <div className="min-h-screen p-4 md:p-8">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes slide-in {
                    from { opacity: 0; transform: translateX(14px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in { animation: fade-in 0.35s ease-out; }
                .animate-slide-in { animation: slide-in 0.3s ease-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f5f5f5; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
            `}</style>

            <div className="max-w-7xl mx-auto">

                {/* ── ENCABEZADO CORPORATIVO ── */}
                <FadeIn className="mb-7">
                    <div className="erp-panel overflow-hidden rounded-[24px]">
                        <div className="erp-panel-header flex flex-wrap items-end justify-between gap-4 px-6 py-4">
                            <div>
                                <div className="erp-page-title">Payables desk</div>
                                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Cuentas por pagar</h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-[10px] text-[#6c8794] uppercase tracking-[0.18em] font-semibold">Saldo general</div>
                                    <div className="erp-mono text-xl font-semibold text-[#173545]">{fmt(saldoTotalGeneral)}</div>
                                </div>
                                <div className="erp-chip flex h-11 w-11 items-center justify-center rounded-xl">
                                    <Icon path={Icons.trendingDown} className="w-5 h-5 text-[#0a628f]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── TARJETAS DE RESUMEN ── */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <FadeIn delay={60} className="rounded-[24px] bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] p-5 text-white shadow-[0_22px_36px_-24px_rgba(15,23,42,.78)]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[#9ec9da] text-[10px] font-bold uppercase tracking-widest">Saldo total</span>
                            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
                                <Icon path={Icons.trendingDown} className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold">{fmt(saldoTotalGeneral)}</div>
                        <div className="text-[#b3cfdb] text-xs mt-1.5">
                            {stats.count} {stats.count === 1 ? 'factura pendiente' : 'facturas pendientes'}
                        </div>
                    </FadeIn>

                    <FadeIn delay={120} className="erp-panel rounded-[24px] p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-red-600 text-[10px] font-bold uppercase tracking-widest">Vencidas</span>
                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                                <Icon path={Icons.alertCircle} className="w-4 h-4 text-red-500" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-red-600">{fmt(stats.vencidas)}</div>
                        <div className="text-slate-400 text-xs mt-1.5">Requieren atención inmediata</div>
                    </FadeIn>

                    <FadeIn delay={180} className="erp-panel rounded-[24px] p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-amber-600 text-[10px] font-bold uppercase tracking-widest">Por Vencer (3d)</span>
                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                <Icon path={Icons.calendar} className="w-4 h-4 text-amber-500" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-amber-600">{fmt(stats.porVencer)}</div>
                        <div className="text-slate-400 text-xs mt-1.5">Próximas a vencer</div>
                    </FadeIn>
                </div>

                {/* ── NAVEGACIÓN TABS ── */}
                <div className="erp-command-strip mb-6 rounded-[24px] p-1.5">
                    <div className="erp-mobile-tabs -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`erp-pressable flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                                    activeTab === tab.id
                                        ? 'bg-[#152533] text-white shadow-[0_16px_26px_-18px_rgba(15,23,42,.8)]'
                                        : 'text-[#5b6e7b] hover:bg-white hover:text-[#16222d]'
                                }`}
                            >
                                <Icon path={Icons[tab.icon]} className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── CONTENIDO TABS ── */}
                <div>

                    {/* TAB: Nueva Factura */}
                    {activeTab === 'Ingresar Factura' && (
                        <SlideIn className="max-w-2xl mx-auto">
                            <Card title="Registrar Nueva Factura" icon="fileText">
                                <form onSubmit={handleSaveFactura} className="space-y-5">
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                                        Las facturas registradas aquí se contabilizan como costo a crédito en {DEFAULT_BRANCH_NAME}.
                                    </div>

                                    <Select
                                        label="Proveedor"
                                        value={facturaForm.proveedor}
                                        onChange={e => setFacturaForm({ ...facturaForm, proveedor: e.target.value })}
                                        required
                                        options={
                                            <>
                                                <option value="">Seleccionar proveedor...</option>
                                                {listaProveedores
                                                    .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                                    .map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)
                                                }
                                            </>
                                        }
                                    />

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Input
                                            label="Fecha Emisión"
                                            type="date"
                                            icon="calendar"
                                            value={facturaForm.fecha}
                                            onChange={e => setFacturaForm({ ...facturaForm, fecha: e.target.value })}
                                            required
                                        />
                                        <Input
                                            label="Fecha Vencimiento"
                                            type="date"
                                            icon="calendar"
                                            value={facturaForm.vencimiento}
                                            onChange={e => setFacturaForm({ ...facturaForm, vencimiento: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Input
                                            label="N° Factura"
                                            icon="fileText"
                                            placeholder="Ej: 001-001-000000001"
                                            value={facturaForm.numero}
                                            onChange={e => setFacturaForm({ ...facturaForm, numero: e.target.value })}
                                        />
                                        <Input
                                            label="Monto Total (C$)"
                                            type="number"
                                            step="0.01"
                                            icon="creditCard"
                                            placeholder="0.00"
                                            value={facturaForm.monto}
                                            onChange={e => setFacturaForm({ ...facturaForm, monto: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <Button type="submit" disabled={loading} className="w-full py-3">
                                        {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Guardando...</span> : 'Guardar Factura'}
                                    </Button>
                                </form>
                            </Card>
                        </SlideIn>
                    )}

                    {/* TAB: Estado de Cuenta */}
                    {activeTab === 'Estado de Cuenta' && (
                        <div className="space-y-5">
                            <Card
                                title="Filtros de estado de cuenta"
                                icon="filter"
                                right={
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Resultado</div>
                                        <div className="erp-mono text-sm font-black text-[#16222d]">{providerEntries.length} proveedores</div>
                                    </div>
                                }
                            >
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                    <Input
                                        label="Proveedor"
                                        icon="search"
                                        placeholder="Buscar por nombre..."
                                        value={estadoCuentaFilters.proveedor}
                                        onChange={e => setEstadoCuentaFilters(prev => ({ ...prev, proveedor: e.target.value }))}
                                    />
                                    <Input
                                        label="Fecha desde"
                                        type="date"
                                        icon="calendar"
                                        value={estadoCuentaFilters.fechaDesde}
                                        onChange={e => setEstadoCuentaFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                                    />
                                    <Input
                                        label="Fecha hasta"
                                        type="date"
                                        icon="calendar"
                                        value={estadoCuentaFilters.fechaHasta}
                                        onChange={e => setEstadoCuentaFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                                    />
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setEstadoCuentaFilters(emptyPayableFilters)}
                                            disabled={!hasActivePayableFilters(estadoCuentaFilters)}
                                            className="w-full whitespace-nowrap"
                                        >
                                            Limpiar
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-3 text-xs font-semibold text-[#6b7f8c]">
                                    Mostrando {stats.count} factura{stats.count === 1 ? '' : 's'} pendiente{stats.count === 1 ? '' : 's'} por fecha de emision.
                                </div>
                            </Card>

                            {providerEntries.map(([prov, provData], idx) => (
                                <FadeIn key={prov} delay={idx * 70}>
                                    {(() => {
                                        const isExpanded = expandedProvider === prov;
                                        const partialCount = provData.items.filter((item) => item.estado === 'parcial').length;
                                        const pendingCount = provData.items.length - partialCount;

                                        return (
                                    <Card
                                        title={prov}
                                        icon="building"
                                        onHeaderDoubleClick={() => toggleProviderExpanded(prov)}
                                        headerClassName="select-none"
                                        right={!isCompactViewport ? (
                                            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                                                <div className="rounded-lg border border-[#f3d8ca] bg-[#fff8f4] px-3 py-2 text-right">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                        Saldo proveedor
                                                    </div>
                                                    <div className="text-lg font-bold text-[#a81d24]">{fmt(provData.saldoTotal)}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        {provData.items.length} {provData.items.length === 1 ? 'factura' : 'facturas'}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="success"
                                                    disabled={loading}
                                                    onClick={() => openModalAbono(prov)}
                                                    className="flex items-center justify-center gap-1.5"
                                                >
                                                    <Icon path={Icons.creditCard} className="w-3.5 h-3.5" />
                                                    Abonar
                                                </Button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleProviderExpanded(prov)}
                                                    className="erp-pressable flex items-center justify-center gap-2 rounded-lg border border-[#c5dce7] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#355161]"
                                                >
                                                    <Icon path={Icons.chevronRight} className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    {isExpanded ? 'Ocultar' : 'Ver'}
                                                </button>
                                            </div>
                                        ) : null}
                                    >
                                        {isCompactViewport && (
                                            <div className="mb-4 rounded-[22px] border border-[#f3d8ca] bg-[linear-gradient(180deg,#fffdfb_0%,#fff6f1_100%)] p-4">
                                                <div className="flex flex-col gap-3">
                                                    <div>
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                            Saldo proveedor
                                                        </div>
                                                        <div className="mt-1 text-2xl font-black text-[#a81d24] erp-mono">
                                                            {fmt(provData.saldoTotal)}
                                                        </div>
                                                        <div className="mt-1 text-xs font-medium text-slate-500">
                                                            {provData.items.length} {provData.items.length === 1 ? 'factura activa' : 'facturas activas'}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="success"
                                                        disabled={loading}
                                                        onClick={() => openModalAbono(prov)}
                                                        className="flex items-center justify-center gap-1.5"
                                                    >
                                                        <Icon path={Icons.creditCard} className="w-3.5 h-3.5" />
                                                        Abonar proveedor
                                                    </Button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleProviderExpanded(prov)}
                                                        className="erp-pressable flex items-center justify-center gap-2 rounded-lg border border-[#c5dce7] bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#355161]"
                                                    >
                                                        <Icon path={Icons.chevronRight} className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                        {isExpanded ? 'Ocultar facturas' : 'Ver facturas'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => toggleProviderExpanded(prov)}
                                            onDoubleClick={() => toggleProviderExpanded(prov)}
                                            className="erp-pressable mb-4 flex w-full items-center justify-between rounded-[20px] border border-[#d7e2e9] bg-[linear-gradient(180deg,#f9fbfd_0%,#f2f7fa_100%)] px-4 py-3 text-left"
                                        >
                                            <div>
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                    Resumen proveedor
                                                </div>
                                                <div className="mt-1 text-sm font-bold text-[#16222d]">
                                                    {provData.items.length} {provData.items.length === 1 ? 'factura activa' : 'facturas activas'}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}{partialCount > 0 ? ` · ${partialCount} parcial` : ''}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#355161]">
                                                <span>{isExpanded ? 'Ocultar' : 'Abrir'}</span>
                                                <Icon path={Icons.chevronRight} className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </div>
                                        </button>

                                        {isExpanded && (isCompactViewport ? (
                                        <div className="space-y-3">
                                            {provData.items.map((f) => {
                                                const vencInfo = getVencimientoInfo(f.vencimiento);
                                                return (
                                                    <div key={f.id} className="erp-mobile-record p-4">
                                                        <div className="mb-3 flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Factura</div>
                                                                <div className="mt-1 break-all text-sm font-black text-slate-800">{f.numero}</div>
                                                            </div>
                                                            <Badge variant={f.estado === 'parcial' ? 'warning' : 'danger'}>
                                                                {f.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                                                            </Badge>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue">
                                                            <div className="erp-mobile-keyvalue-row">
                                                                <span>Emision</span>
                                                                <span>{f.fecha}</span>
                                                            </div>
                                                            <div className="erp-mobile-keyvalue-row">
                                                                <span>Vence</span>
                                                                <span>
                                                                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                                                        {vencInfo.text}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <div className="erp-mobile-keyvalue-row">
                                                                <span>Monto</span>
                                                                <span className="erp-mono font-bold">{fmt(f.monto)}</span>
                                                            </div>
                                                            <div className="erp-mobile-keyvalue-row">
                                                                <span>Abonado</span>
                                                                <span className="erp-mono font-semibold text-emerald-600">
                                                                    {f.yaAbonado > 0 ? fmt(f.yaAbonado) : '—'}
                                                                </span>
                                                            </div>
                                                            <div className="erp-mobile-keyvalue-row">
                                                                <span>Saldo</span>
                                                                <span className="erp-mono font-extrabold text-[#a81d24]">{fmt(f.saldo)}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteFactura(f)}
                                                            disabled={loading}
                                                            className="erp-pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#a81d24] disabled:opacity-30"
                                                        >
                                                            <Icon path={Icons.trash} className="h-4 w-4" />
                                                            Eliminar factura
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        ) : (
                                        <div className="erp-table-shell overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr>
                                                        {['N° Factura', 'Emisión', 'Vencimiento', 'Monto', 'Abonado', 'Saldo', 'Estado', ''].map(h => (
                                                            <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${h === '' || h === 'Monto' || h === 'Abonado' || h === 'Saldo' ? 'text-right' : h === 'Estado' ? 'text-center' : 'text-left'}`}>
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {provData.items.map(f => {
                                                        const vencInfo = getVencimientoInfo(f.vencimiento);
                                                        return (
                                                            <tr key={f.id} className="group transition-colors">
                                                                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{f.numero}</td>
                                                                <td className="px-4 py-3 text-xs text-slate-500">{f.fecha}</td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={vencInfo.variant}>{vencInfo.text}</Badge>
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-xs text-slate-500 font-medium">{fmt(f.monto)}</td>
                                                                <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-600">
                                                                    {f.yaAbonado > 0 ? fmt(f.yaAbonado) : <span className="text-stone-300">—</span>}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-[#a81d24]">{fmt(f.saldo)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <Badge variant={f.estado === 'parcial' ? 'warning' : 'danger'}>
                                                                        {f.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        onClick={() => handleDeleteFactura(f)}
                                                                        disabled={loading}
                                                                        className="erp-pressable p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-20"
                                                                    >
                                                                        <Icon path={Icons.trash} className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        ))}
                                    </Card>
                                        );
                                    })()}
                                </FadeIn>
                            ))}

                            {providerEntries.length === 0 && (
                                <div className="erp-empty-state px-6 py-16 text-center">
                                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Icon path={Icons.checkCircle} className="w-7 h-7 text-emerald-500" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-700">Todo al día</h3>
                                    <p className="text-sm text-slate-400 mt-1">No hay facturas pendientes por pagar</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: Historial Abonos */}
                    {activeTab === 'Historial Abonos' && (
                        <SlideIn>
                            <Card title="Historial de Abonos" icon="receipt">
                                <div className="mb-5 rounded-2xl border border-[#d7e2e9] bg-[#f7fbfd] p-4">
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                        <Input
                                            label="Proveedor"
                                            icon="search"
                                            placeholder="Buscar proveedor..."
                                            value={abonosFilters.proveedor}
                                            onChange={e => setAbonosFilters(prev => ({ ...prev, proveedor: e.target.value }))}
                                        />
                                        <Input
                                            label="Fecha desde"
                                            type="date"
                                            icon="calendar"
                                            value={abonosFilters.fechaDesde}
                                            onChange={e => setAbonosFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                                        />
                                        <Input
                                            label="Fecha hasta"
                                            type="date"
                                            icon="calendar"
                                            value={abonosFilters.fechaHasta}
                                            onChange={e => setAbonosFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                                        />
                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setAbonosFilters(emptyPayableFilters)}
                                                disabled={!hasActivePayableFilters(abonosFilters)}
                                                className="w-full whitespace-nowrap"
                                            >
                                                Limpiar
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#6b7f8c]">
                                        <span>{abonosFiltrados.length} abono{abonosFiltrados.length === 1 ? '' : 's'} encontrados por fecha de pago.</span>
                                        <span className="erp-mono font-black text-[#16222d]">{fmt(totalAbonosFiltrados)}</span>
                                    </div>
                                </div>

                                {abonosFiltrados.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Icon path={Icons.receipt} className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                                        <p className="text-sm font-medium text-slate-400">
                                            {hasActivePayableFilters(abonosFilters) ? 'No hay abonos con esos filtros' : 'No hay abonos registrados'}
                                        </p>
                                    </div>
                                ) : (
                                    isCompactViewport ? (
                                        <div className="space-y-3">
                                            {abonosFiltrados.map(a => {
                                                const isExpanded = expandedAbonoId === a.id;
                                                const detalleFacturas = getAbonoDetalleFacturas(a);

                                                return (
                                                <div key={a.id} className="erp-mobile-record p-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedAbonoId(prev => prev === a.id ? null : a.id)}
                                                        className="mb-3 flex w-full items-start justify-between gap-3 text-left"
                                                    >
                                                        <div>
                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Recibo</div>
                                                            <div className="mt-1 text-sm font-black text-[#a81d24]">#{a.secuencia}</div>
                                                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#607888]">
                                                                {isExpanded ? 'Ocultar detalle' : 'Ver facturas pagadas'}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <Badge variant={isCreditCardPayment(a.paymentMethod) ? 'purple' : a.paymentMethod === CASH_PAYMENT_METHOD ? 'warning' : 'info'}>
                                                                {getPaymentMethodLabel(a.paymentMethod || TRANSFER_PAYMENT_METHOD)}
                                                            </Badge>
                                                            <Icon path={Icons.chevronRight} className={`h-4 w-4 text-[#607888] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                        </div>
                                                    </button>
                                                    <div className="erp-mobile-keyvalue">
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Fecha</span>
                                                            <span>{a.fecha}</span>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Proveedor</span>
                                                            <span>{a.proveedor}</span>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Monto</span>
                                                            <span className="erp-mono font-extrabold text-emerald-600">{fmt(a.montoTotal)}</span>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <AbonoDetalle detalle={detalleFacturas} fmt={fmt} compact />
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteAbono(a)}
                                                        disabled={loading}
                                                        className="erp-pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#a81d24] disabled:opacity-30"
                                                    >
                                                        <Icon path={Icons.x} className="h-4 w-4" />
                                                        Anular abono
                                                    </button>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="erp-table-shell overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr>
                                                    {['Recibo #', 'Fecha', 'Proveedor', 'Método', 'Monto', 'Acción'].map(h => (
                                                        <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Monto' ? 'text-right' : h === 'Acción' ? 'text-center' : 'text-left'}`}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {abonosFiltrados.map(a => {
                                                    const isExpanded = expandedAbonoId === a.id;
                                                    const detalleFacturas = getAbonoDetalleFacturas(a);

                                                    return (
                                                        <React.Fragment key={a.id}>
                                                            <tr
                                                                className="cursor-pointer hover:bg-stone-50 transition-colors"
                                                                onClick={() => setExpandedAbonoId(prev => prev === a.id ? null : a.id)}
                                                            >
                                                                <td className="px-4 py-3 font-mono font-bold text-[#a81d24]">
                                                                    <div className="flex items-center gap-2">
                                                                        <Icon path={Icons.chevronRight} className={`h-3.5 w-3.5 text-[#607888] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                        #{a.secuencia}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-slate-500">{a.fecha}</td>
                                                                <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{a.proveedor}</td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={isCreditCardPayment(a.paymentMethod) ? 'purple' : a.paymentMethod === CASH_PAYMENT_METHOD ? 'warning' : 'info'}>
                                                                        {getPaymentMethodLabel(a.paymentMethod || TRANSFER_PAYMENT_METHOD)}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(a.montoTotal)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleDeleteAbono(a);
                                                                        }}
                                                                        disabled={loading}
                                                                        className="erp-pressable text-red-500 hover:text-red-700 font-semibold text-xs uppercase px-3 py-1 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        Anular
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={6} className="bg-[#f7fbfd] px-4 py-4">
                                                                        <AbonoDetalle detalle={detalleFacturas} fmt={fmt} />
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    )
                                )}
                            </Card>
                        </SlideIn>
                    )}

                    {/* TAB: Historial Facturas */}
                    {activeTab === 'Historial Facturas' && (
                        <SlideIn>
                            <Card
                                title="Historial de Facturas de Credito"
                                icon="fileText"
                                right={
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Saldo filtrado</div>
                                        <div className="erp-mono text-sm font-black text-[#a81d24]">{fmt(historialFacturasStats.saldo)}</div>
                                    </div>
                                }
                            >
                                <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-medium text-sky-800">
                                    Vista solo lectura. Estas facturas salen de cuentas_por_pagar y siguen vinculadas a sus compras/gastos originales.
                                </div>

                                <div className="mb-5 rounded-2xl border border-[#d7e2e9] bg-[#f7fbfd] p-4">
                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.9fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,.9fr)_auto]">
                                        <Input
                                            label="Proveedor"
                                            icon="search"
                                            placeholder="Buscar proveedor..."
                                            value={facturasHistoryFilters.proveedor}
                                            onChange={e => setFacturasHistoryFilters(prev => ({ ...prev, proveedor: e.target.value }))}
                                        />
                                        <Input
                                            label="Factura"
                                            icon="fileText"
                                            placeholder="Numero..."
                                            value={facturasHistoryFilters.factura}
                                            onChange={e => setFacturasHistoryFilters(prev => ({ ...prev, factura: e.target.value }))}
                                        />
                                        <Input
                                            label="Fecha desde"
                                            type="date"
                                            icon="calendar"
                                            value={facturasHistoryFilters.fechaDesde}
                                            onChange={e => setFacturasHistoryFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                                        />
                                        <Input
                                            label="Fecha hasta"
                                            type="date"
                                            icon="calendar"
                                            value={facturasHistoryFilters.fechaHasta}
                                            onChange={e => setFacturasHistoryFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                                        />
                                        <Select
                                            label="Estado"
                                            value={facturasHistoryFilters.estado}
                                            onChange={e => setFacturasHistoryFilters(prev => ({ ...prev, estado: e.target.value }))}
                                            options={invoiceStatusOptions.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        />
                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setFacturasHistoryFilters({ ...emptyPayableFilters, estado: 'todos', factura: '' })}
                                                disabled={
                                                    !hasActivePayableFilters(facturasHistoryFilters)
                                                    && !facturasHistoryFilters.factura
                                                    && facturasHistoryFilters.estado === 'todos'
                                                }
                                                className="w-full whitespace-nowrap"
                                            >
                                                Limpiar
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                                    <div className="rounded-2xl border border-[#d7e2e9] bg-white p-4">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Facturas</div>
                                        <div className="mt-1 text-xl font-black text-[#16222d]">{historialFacturasCredito.length}</div>
                                    </div>
                                    <div className="rounded-2xl border border-[#d7e2e9] bg-white p-4">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Total</div>
                                        <div className="mt-1 erp-mono text-sm font-black text-[#16222d]">{fmt(historialFacturasStats.total)}</div>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Pagadas</div>
                                        <div className="mt-1 text-xl font-black text-emerald-700">{historialFacturasStats.pagada}</div>
                                    </div>
                                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">Vencidas</div>
                                        <div className="mt-1 text-xl font-black text-red-700">{historialFacturasStats.vencida}</div>
                                    </div>
                                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Vigentes</div>
                                        <div className="mt-1 text-xl font-black text-sky-700">{historialFacturasStats.vigente}</div>
                                    </div>
                                </div>

                                {historialFacturasCredito.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Icon path={Icons.fileText} className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                                        <p className="text-sm font-medium text-slate-400">No hay facturas con esos filtros</p>
                                    </div>
                                ) : isCompactViewport ? (
                                    <div className="space-y-3">
                                        {historialFacturasCredito.map((factura) => {
                                            const vencInfo = getVencimientoInfo(factura.vencimiento);
                                            return (
                                                <div key={factura.id} className="erp-mobile-record p-4">
                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Factura</div>
                                                            <div className="mt-1 break-all text-sm font-black text-slate-800">{factura.numero}</div>
                                                            <div className="mt-1 text-xs font-semibold text-[#607888]">{factura.proveedor}</div>
                                                        </div>
                                                        <Badge variant={factura.statusInfo.variant}>{factura.statusInfo.label}</Badge>
                                                    </div>
                                                    <div className="erp-mobile-keyvalue">
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Emision</span>
                                                            <span>{factura.fecha}</span>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Vence</span>
                                                            <span>{factura.statusInfo.status === 'pagada' ? 'Pagada' : vencInfo.text}</span>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Monto</span>
                                                            <span className="erp-mono font-bold">{fmt(factura.monto)}</span>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Abonado</span>
                                                            <span className="erp-mono font-semibold text-emerald-600">{factura.yaAbonado > 0 ? fmt(factura.yaAbonado) : '-'}</span>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Saldo</span>
                                                            <span className="erp-mono font-extrabold text-[#a81d24]">{fmt(factura.saldo)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="erp-table-shell overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr>
                                                    {['Factura', 'Fecha', 'Proveedor', 'Vencimiento', 'Estado', 'Monto', 'Abonado', 'Saldo'].map(h => (
                                                        <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${['Monto', 'Abonado', 'Saldo'].includes(h) ? 'text-right' : h === 'Estado' ? 'text-center' : 'text-left'}`}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {historialFacturasCredito.map((factura) => {
                                                    const vencInfo = getVencimientoInfo(factura.vencimiento);
                                                    return (
                                                        <tr key={factura.id} className="hover:bg-stone-50 transition-colors">
                                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{factura.numero}</td>
                                                            <td className="px-4 py-3 text-xs text-slate-500">{factura.fecha}</td>
                                                            <td className="px-4 py-3 text-xs font-semibold text-slate-800">{factura.proveedor}</td>
                                                            <td className="px-4 py-3">
                                                                {factura.statusInfo.status === 'pagada'
                                                                    ? <span className="text-xs text-slate-400">-</span>
                                                                    : <Badge variant={vencInfo.variant}>{vencInfo.text}</Badge>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Badge variant={factura.statusInfo.variant}>{factura.statusInfo.label}</Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">{fmt(factura.monto)}</td>
                                                            <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-600">
                                                                {factura.yaAbonado > 0 ? fmt(factura.yaAbonado) : <span className="text-stone-300">-</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-[#a81d24]">{fmt(factura.saldo)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </SlideIn>
                    )}

                    {/* TAB: Base de Proveedores */}
                    {activeTab === 'Base de Proveedores' && (
                        <SlideIn className="max-w-2xl mx-auto">
                            <Card title="Directorio de Proveedores" icon="users">
                                <form onSubmit={handleAddProveedor} className="mb-5 flex flex-col gap-2 sm:flex-row">
                                    <input
                                        type="text"
                                        placeholder="Nombre del nuevo proveedor..."
                                        className="flex-1 bg-stone-50 border border-stone-300 rounded-lg px-3.5 py-2.5 text-sm font-medium uppercase outline-none focus:border-[#a81d24] focus:bg-white transition-all"
                                        value={nuevoProveedor}
                                        onChange={e => setNuevoProveedor(e.target.value)}
                                    />
                                    <Button type="submit" disabled={loading || !nuevoProveedor.trim()} className="flex items-center justify-center gap-1.5">
                                        <Icon path={Icons.plus} className="w-4 h-4" />
                                        Agregar
                                    </Button>
                                </form>

                                <div className="space-y-2">
                                    {listaProveedores
                                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                        .map((p, idx) => (
                                            <FadeIn key={p.id} delay={idx * 25}>
                                                <div className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-lg border border-stone-200 hover:border-[#a81d24]/30 hover:shadow-sm transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-[#a81d24] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                                            {p.nombre.charAt(0)}
                                                        </div>
                                                        <span className="font-semibold text-slate-700 text-sm">{p.nombre}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteDoc(doc(db, 'proveedores', p.id))}
                                                        className="erp-pressable p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Icon path={Icons.trash} className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </FadeIn>
                                        ))
                                    }
                                </div>
                            </Card>
                        </SlideIn>
                    )}
                </div>

                {/* ── MODAL ABONO ── */}
                {showModalAbono && (
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
                        onClick={closeModalAbono}
                    >
                        <div
                            className="bg-white rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-in"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal header con franja de color */}
                            <div className="h-1 bg-gradient-to-r from-[#a81d24] via-[#f2b635] to-[#a81d24]" />
                            <div className="px-6 py-5">
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a81d24] mb-0.5">Registrar Pago</p>
                                        <h3 className="text-lg font-bold text-slate-900">Realizar Abono</h3>
                                        <p className="text-sm text-slate-500">{proveedorSeleccionado}</p>
                                    </div>
                                    <button
                                        onClick={closeModalAbono}
                                        disabled={loading}
                                        className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-40"
                                    >
                                        <Icon path={Icons.x} className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                {/* Resumen de selección */}
                                <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 mb-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Facturas a incluir</span>
                                        <button
                                            onClick={handleSeleccionarTodas}
                                            className="text-xs font-semibold text-[#a81d24] hover:text-[#7f1218] transition-colors"
                                        >
                                            {selectedFacturas.length === (facturasPorProveedor[proveedorSeleccionado]?.items || []).length
                                                ? 'Desmarcar todas'
                                                : 'Seleccionar todas'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="bg-white rounded-lg border border-stone-200 p-3">
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Seleccionadas</div>
                                            <div className="text-xl font-bold text-slate-800">
                                                {selectedFacturas.length}
                                                <span className="text-sm font-normal text-slate-400"> / {facturasPorProveedor[proveedorSeleccionado]?.items.length || 0}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-lg border border-stone-200 p-3">
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total seleccionado</div>
                                            <div className="text-xl font-bold text-[#a81d24]">{fmt(montoPrevisualizado)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de facturas */}
                                <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
                                    {facturasPorProveedor[proveedorSeleccionado]?.items.map(f => (
                                        <label
                                            key={f.id}
                                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedFacturas.includes(f.id)
                                                    ? 'border-[#a81d24] bg-[#fff5f5] shadow-sm'
                                                    : 'border-stone-200 bg-white hover:border-stone-300'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                                                selectedFacturas.includes(f.id)
                                                    ? 'bg-[#a81d24] border-[#a81d24]'
                                                    : 'border-stone-300'
                                            }`}>
                                                {selectedFacturas.includes(f.id) && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedFacturas.includes(f.id)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setSelectedFacturas([...selectedFacturas, f.id]);
                                                    } else {
                                                        setSelectedFacturas(selectedFacturas.filter(id => id !== f.id));
                                                    }
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-slate-800 text-xs">Factura #{f.numero}</div>
                                                <div className="text-[10px] text-slate-400">Emisión: {f.fecha}</div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <div className="font-bold text-[#a81d24] text-sm">{fmt(f.saldo)}</div>
                                                <div className="text-[10px] text-slate-400">saldo</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {/* Monto a abonar */}
                                <div className="mb-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monto a Abonar</label>
                                        {selectedFacturas.length > 0 && (
                                            <button
                                                onClick={handleAbonarMontoSeleccionado}
                                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <Icon path={Icons.calculator} className="w-3 h-3" />
                                                Usar total ({fmt(montoPrevisualizado)})
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">C$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg pl-11 pr-4 py-3 text-xl font-bold text-[#a81d24] text-center outline-none focus:border-[#a81d24] focus:bg-white transition-all"
                                            value={montoAbono}
                                            onChange={e => setMontoAbono(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {parseFloat(montoAbono) > montoPrevisualizado && montoPrevisualizado > 0 && (
                                        <div className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                                            <Icon path={Icons.alertCircle} className="w-3.5 h-3.5" />
                                            El monto supera el total seleccionado.
                                        </div>
                                    )}
                                </div>

                                {/* Método de pago */}
                                <div className="mb-5">
                                    <Select
                                        label="Método de Pago"
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        options={
                                            <>
                                                {PAYABLE_PAYMENT_METHOD_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </>
                                        }
                                    />
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        {paymentMethod === CASH_PAYMENT_METHOD
                                            ? 'Se registrara tambien en Gastos Diarios como salida de caja.'
                                            : isCreditCardPayment(paymentMethod)
                                                ? 'Aumenta el saldo de Tarjeta Infinite Lafise en Pasivos.'
                                                : 'Solo actualiza el saldo de la cuenta por pagar.'}
                                    </p>
                                </div>

                                {/* Botones de acción */}
                                <div className="flex gap-2 pt-4 border-t border-stone-100">
                                    <Button variant="ghost" onClick={closeModalAbono} disabled={loading} className="flex-1">
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="success"
                                        onClick={handleRealizarAbono}
                                        disabled={loading || !montoAbono || parseFloat(montoAbono) <= 0 || selectedFacturas.length === 0}
                                        className="flex-[2] flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <><Spinner /> Procesando...</>
                                        ) : (
                                            <><Icon path={Icons.arrowRightCircle} className="w-4 h-4" />
                                            Confirmar {montoAbono ? fmt(parseFloat(montoAbono)) : ''}</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
