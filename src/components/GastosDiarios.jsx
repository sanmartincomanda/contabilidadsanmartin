// src/components/GastosDiarios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection, Timestamp, getDocs, doc, writeBatch
} from 'firebase/firestore';
import { DEFAULT_BRANCH_ID, DEFAULT_BRANCH_NAME, fmt } from '../constants';
import { getLocalDateString } from '../utils/localDate';
import {
    EXPENSE_CATEGORY_OPTIONS,
    getDefaultSubcategory,
    getExpenseSubcategories,
    normalizeExpenseClassification,
} from '../services/expenseCategories';
import {
    CASH_PAYMENT_METHOD,
    ENTRY_PAYMENT_METHOD_OPTIONS,
    getPaymentMethodLabel,
    isCreditCardPayment,
    normalizePaymentMethod,
    setCreditCardChargeInBatch,
    deleteCreditCardMovementInBatch,
} from '../services/creditCardLiabilities';

// --- ICONOS SVG INLINE ---
const Icons = {
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    fileText: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    alertCircle: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    printer: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
    refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    chevronRight: "M9 5l7 7-7 7",
    trendingDown: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
    shoppingCart: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
};

const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

// --- COMPONENTES UI ---

const Card = ({ title, children, className = "", right, icon }) => (
        <div className={`erp-panel erp-panel-hover rounded-[24px] overflow-hidden ${className}`}>
        <div className="erp-panel-header flex justify-between items-center px-5 py-3.5 border-b border-[#c5dce7]">
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

const Button = ({ children, variant = 'primary', className = '', disabled, size = 'md', ...props }) => {
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
    const variants = {
        primary: 'bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] text-white shadow-[0_16px_28px_-18px_rgba(15,23,42,.78)] hover:brightness-[1.04]',
        success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-[#a81d24] hover:bg-[#7f1218] text-white',
        ghost: 'bg-white hover:bg-[#f3f9fc] text-[#45606d] border border-[#c5dce7]',
        dark: 'bg-[#173545] hover:bg-[#102734] text-white'
    };

    return (
        <button
            disabled={disabled}
            className={`erp-pressable ${sizes[size]} rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Input = ({ label, icon, type = "text", className = '', ...props }) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-semibold uppercase tracking-widest text-[#61727f]">{label}</label>}
        <div className="relative group">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72909d] group-focus-within:text-[#0a628f] transition-colors" />}
            <input
                type={type}
                className={`w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-medium text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12 ${icon ? 'pl-10' : ''} ${className}`}
                {...props}
            />
        </div>
    </div>
);

const Select = ({ label, icon, options, ...props }) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-semibold uppercase tracking-widest text-[#61727f]">{label}</label>}
        <div className="relative">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72909d] pointer-events-none" />}
            <select
                className={`w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-medium text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12 appearance-none cursor-pointer pr-8 ${icon ? 'pl-10' : ''}`}
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
        default: 'bg-stone-100 text-stone-600',
        success: 'bg-emerald-100 text-emerald-700',
        danger: 'bg-[#fff0f0] text-[#a81d24]',
        warning: 'bg-amber-100 text-amber-700',
        purple: 'bg-purple-100 text-purple-700'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${variants[variant]}`}>{children}</span>;
};

// --- COMPONENTE PRINCIPAL ---

const CAJA = 'Caja Carnes Amparito';

export default function GastosDiarios({ categories = [] }) {
    const [activeTab, setActiveTab] = useState('registro');
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Formulario
    const [fecha, setFecha] = useState(getLocalDateString());
    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [tipo, setTipo] = useState('Gasto');
    const [categoria, setCategoria] = useState('');
    const [subcategoria, setSubcategoria] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(CASH_PAYMENT_METHOD);
    const subcategoryOptions = getExpenseSubcategories(categoria);

    const handleCategoriaChange = (value) => {
        setCategoria(value);
        setSubcategoria(getDefaultSubcategory(value));
    };

    // Historial
    const [filtroFecha, setFiltroFecha] = useState(getLocalDateString());
    const [registros, setRegistros] = useState([]);

    const cargarRegistros = useCallback(async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'gastosDiarios'));

            let docs = snapshot.docs.map(d => {
                const record = { id: d.id, ...d.data(), timestamp: d.data().timestamp || null };
                if (record.tipo !== 'Gasto') return record;
                const classification = normalizeExpenseClassification({
                    category: record.category || record.categoria,
                    subcategory: record.subcategory || record.subcategoria,
                    description: record.descripcion,
                });
                return {
                    ...record,
                    categoria: classification.category,
                    subcategoria: classification.subcategory,
                    category: classification.category,
                    subcategory: classification.subcategory,
                    categoryKey: `${classification.category} / ${classification.subcategory}`,
                };
            });

            docs.sort((a, b) => {
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });

            if (filtroFecha) {
                docs = docs.filter(d => d.fecha === filtroFecha);
            }

            setRegistros(docs);
        } catch (error) {
            console.error('Error cargando registros:', error);
            alert('Error al cargar los registros: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [filtroFecha]);

    useEffect(() => {
        if (activeTab === 'historial') {
            cargarRegistros();
        }
    }, [activeTab, cargarRegistros, refreshKey]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numMonto = Number(monto);
        if (isNaN(numMonto) || numMonto <= 0) return alert('Monto inválido.');
        if (!descripcion) return alert('Ingrese una descripción.');
        if (tipo === 'Gasto' && (!categoria || !subcategoria)) return alert('Categoria y subcategoria requeridas para gastos.');

        setLoading(true);
        try {
            const timestamp = Timestamp.now();
            const classification = tipo === 'Gasto'
                ? normalizeExpenseClassification({ category: categoria, subcategory: subcategoria, description: descripcion })
                : normalizeExpenseClassification({ category: 'Costos de venta / compras', description: descripcion, type: 'Compra' });
            const categoriaNombre = classification.category;
            const gastoDiarioRef = doc(collection(db, 'gastosDiarios'));
            const gastoRef = tipo === 'Gasto' ? doc(collection(db, 'gastos')) : null;
            const compraRef = tipo === 'Compra' ? doc(collection(db, 'compras')) : null;
            const batch = writeBatch(db);
            const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod, CASH_PAYMENT_METHOD);
            const creditCardMovement = isCreditCardPayment(normalizedPaymentMethod)
                ? setCreditCardChargeInBatch(batch, {
                    sourceCollection: 'gastosDiarios',
                    sourceId: gastoDiarioRef.id,
                    sourceType: tipo,
                    date: fecha,
                    description: descripcion,
                    amount: numMonto,
                    category: categoriaNombre,
                    subcategory: classification.subcategory,
                    provider: tipo === 'Compra' ? descripcion.trim().toUpperCase() : null,
                    paymentMethod: normalizedPaymentMethod,
                })
                : null;

            batch.set(gastoDiarioRef, {
                fecha,
                caja: CAJA,
                descripcion,
                monto: numMonto,
                tipo,
                categoria: categoriaNombre || null,
                subcategoria: classification.subcategory || null,
                category: categoriaNombre || null,
                subcategory: classification.subcategory || null,
                categoryKey: `${classification.category} / ${classification.subcategory}`,
                sucursal: DEFAULT_BRANCH_ID,
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                linkedExpenseId: gastoRef?.id || null,
                linkedPurchaseId: compraRef?.id || null,
                paymentMethod: normalizedPaymentMethod,
                paymentMethodLabel: getPaymentMethodLabel(normalizedPaymentMethod),
                linkedCreditCardMovementId: creditCardMovement?.id || null,
                timestamp
            });

            if (gastoRef) {
                batch.set(gastoRef, {
                    date: fecha,
                    description: descripcion,
                    amount: numMonto,
                    category: categoriaNombre,
                    subcategory: classification.subcategory,
                    categoryKey: `${classification.category} / ${classification.subcategory}`,
                    branch: DEFAULT_BRANCH_ID,
                    branchName: DEFAULT_BRANCH_NAME,
                    paymentMethod: normalizedPaymentMethod,
                    paymentMethodLabel: getPaymentMethodLabel(normalizedPaymentMethod),
                    linkedCreditCardMovementId: creditCardMovement?.id || null,
                    timestamp,
                    is_conciled: false,
                    origen: 'gastosDiarios',
                    gastoDiarioId: gastoDiarioRef.id
                });
            }

            if (compraRef) {
                batch.set(compraRef, {
                    date: fecha,
                    month: fecha.substring(0, 7),
                    supplier: descripcion.trim().toUpperCase(),
                    invoiceNumber: `GD-${gastoDiarioRef.id.slice(0, 8).toUpperCase()}`,
                    amount: numMonto,
                    category: classification.category,
                    subcategory: classification.subcategory,
                    categoryKey: `${classification.category} / ${classification.subcategory}`,
                    branch: DEFAULT_BRANCH_ID,
                    branchName: DEFAULT_BRANCH_NAME,
                    paymentType: 'contado',
                    paymentMethod: normalizedPaymentMethod,
                    paymentMethodLabel: getPaymentMethodLabel(normalizedPaymentMethod),
                    linkedCreditCardMovementId: creditCardMovement?.id || null,
                    isInventoryCost: true,
                    description: descripcion,
                    sourceCollection: 'gastosDiarios',
                    sourceGastoDiarioId: gastoDiarioRef.id,
                    timestamp
                });
            }

            await batch.commit();

            setDescripcion('');
            setMonto('');
            setCategoria('');
            setSubcategoria('');
            setPaymentMethod(CASH_PAYMENT_METHOD);
            alert(`${tipo} registrado correctamente`);
            setRefreshKey(prev => prev + 1);

        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (registro) => {
        if (registro.tipo === 'ABONO' && (registro.origen === 'abonos_pagar' || registro.linkedAbonoId)) {
            return alert('Los abonos en efectivo se anulan desde Cuentas por Pagar.');
        }
        if (!window.confirm('¿Eliminar este registro?')) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'gastosDiarios', registro.id));
            deleteCreditCardMovementInBatch(batch, 'gastosDiarios', registro.id);

            if (registro.tipo === 'Gasto') {
                if (registro.linkedExpenseId) {
                    batch.delete(doc(db, 'gastos', registro.linkedExpenseId));
                } else {
                    const gastosSnapshot = await getDocs(collection(db, 'gastos'));
                    const gastosRelacionados = gastosSnapshot.docs.filter(
                        d => d.data().gastoDiarioId === registro.id
                    );
                    for (const gastoDoc of gastosRelacionados) {
                        batch.delete(doc(db, 'gastos', gastoDoc.id));
                    }
                }
            }

            if (registro.tipo === 'Compra') {
                if (registro.linkedPurchaseId) {
                    batch.delete(doc(db, 'compras', registro.linkedPurchaseId));
                } else {
                    const comprasSnapshot = await getDocs(collection(db, 'compras'));
                    const comprasRelacionadas = comprasSnapshot.docs.filter(
                        item => item.data().sourceGastoDiarioId === registro.id
                    );
                    for (const compraDoc of comprasRelacionadas) {
                        batch.delete(doc(db, 'compras', compraDoc.id));
                    }
                }
            }

            await batch.commit();
            cargarRegistros();
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar');
        } finally {
            setLoading(false);
        }
    };

    const totalGastos = registros.filter(r => r.tipo === 'Gasto').reduce((sum, r) => sum + (r.monto || 0), 0);
    const totalCompras = registros.filter(r => r.tipo === 'Compra').reduce((sum, r) => sum + (r.monto || 0), 0);
    const totalAbonos = registros.filter(r => r.tipo === 'ABONO').reduce((sum, r) => sum + (r.monto || 0), 0);
    const totalGeneral = totalGastos + totalCompras + totalAbonos;

    return (
        <div className="space-y-5">
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out; }
                @media print { .no-print { display: none !important; } }
            `}</style>

            {/* Page header */}
            <div className="erp-panel overflow-hidden rounded-[24px] no-print">
                <div className="erp-panel-header flex flex-wrap items-end justify-between gap-4 px-5 py-4">
                    <div>
                        <div className="erp-page-title">Cash desk</div>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Caja diaria</h1>
                    </div>
                    <span className="erp-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                        {CAJA}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="erp-command-strip rounded-[24px] p-1.5 no-print">
                <div className="erp-mobile-tabs -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:overflow-visible">
                    <button
                        onClick={() => setActiveTab('registro')}
                        className={`erp-pressable flex shrink-0 items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                            activeTab === 'registro'
                                ? 'bg-[#152533] text-white shadow-[0_16px_26px_-18px_rgba(15,23,42,.8)]'
                                : 'text-[#5b6e7b] hover:bg-white hover:text-[#16222d]'
                        }`}
                    >
                        <Icon path={Icons.receipt} className="w-3.5 h-3.5" />
                        Registro
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`erp-pressable flex shrink-0 items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                            activeTab === 'historial'
                                ? 'bg-[#152533] text-white'
                                : 'text-[#5b6e7b] hover:bg-white hover:text-[#16222d]'
                        }`}
                    >
                        <Icon path={Icons.calendar} className="w-3.5 h-3.5" />
                        Historial
                    </button>
                </div>
            </div>

            {activeTab === 'registro' ? (
                <div className="animate-fade-in max-w-lg">
                    <Card title="Captura de caja" icon="receipt" gradient={true}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Fecha + Tipo en la misma fila */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Input
                                    label="Fecha"
                                    type="date"
                                    icon="calendar"
                                    value={fecha}
                                    onChange={e => setFecha(e.target.value)}
                                    required
                                />
                                <Select
                                    label="Tipo"
                                    icon="receipt"
                                    value={tipo}
                                    onChange={e => {
                                        setTipo(e.target.value);
                                        if (e.target.value !== 'Gasto') {
                                            setCategoria('');
                                            setSubcategoria('');
                                        }
                                    }}
                                    options={
                                        <>
                                            <option value="Gasto">Gasto</option>
                                            <option value="Compra">Compra</option>
                                        </>
                                    }
                                />
                            </div>

                            <Input
                                label="Descripción"
                                icon="fileText"
                                placeholder={tipo === 'Compra' ? 'Ej: Proveedor / mercancía...' : 'Ej: Pago de servicio, suministros...'}
                                value={descripcion}
                                onChange={e => setDescripcion(e.target.value)}
                                required
                            />

                            <Input
                                label="Monto"
                                type="number"
                                step="0.01"
                                icon="dollar"
                                placeholder="0.00"
                                className={`text-lg font-bold ${tipo === 'Gasto' ? 'text-rose-600' : 'text-purple-600'}`}
                                value={monto}
                                onChange={e => setMonto(e.target.value)}
                                required
                            />

                            <Select
                                label="Metodo de pago"
                                icon="cash"
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                options={
                                    <>
                                        {ENTRY_PAYMENT_METHOD_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </>
                                }
                            />

                            {tipo === 'Gasto' && (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <Select
                                        label="Categoria"
                                        icon="tag"
                                        value={categoria}
                                        onChange={e => handleCategoriaChange(e.target.value)}
                                        required
                                        options={
                                            <>
                                                <option value="">Seleccionar categoria...</option>
                                                {EXPENSE_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </>
                                        }
                                    />
                                    <Select
                                        label="Subcategoria"
                                        icon="tag"
                                        value={subcategoria}
                                        onChange={e => setSubcategoria(e.target.value)}
                                        required
                                        disabled={!categoria}
                                        options={
                                            <>
                                                <option value="">Seleccionar subcategoria...</option>
                                                {subcategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                            </>
                                        }
                                    />
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? 'Guardando...' : `Registrar ${tipo}`}
                            </Button>
                        </form>
                    </Card>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <Card
                        title="Reporte de Cierre de Caja"
                        icon="printer"
                        right={
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 rounded-lg bg-[#2b1113] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1a0a0b] no-print"
                            >
                                <Icon path={Icons.printer} className="w-3.5 h-3.5" /> Imprimir
                            </button>
                        }
                    >
                        <div className="space-y-5">
                            {/* Filtros */}
                            <div className="erp-filter-panel flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
                                <Input
                                    label="Fecha"
                                    type="date"
                                    icon="calendar"
                                    value={filtroFecha}
                                    onChange={e => setFiltroFecha(e.target.value)}
                                />
                                <Button
                                    onClick={cargarRegistros}
                                    variant="ghost"
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 sm:w-auto"
                                >
                                    <Icon path={Icons.refresh} className="w-4 h-4" /> Actualizar
                                </Button>
                            </div>

                            {/* Totales */}
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                <div className="erp-metric-card overflow-hidden">
                                    <div className="h-0.5 bg-[#a81d24]" />
                                    <div className="p-3.5 text-center">
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Gastos</div>
                                        <div className="text-lg font-black text-[#a81d24] mt-1 font-mono">{fmt(totalGastos)}</div>
                                    </div>
                                </div>
                                <div className="erp-metric-card overflow-hidden">
                                    <div className="h-0.5 bg-amber-500" />
                                    <div className="p-3.5 text-center">
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Compras</div>
                                        <div className="text-lg font-black text-amber-700 mt-1 font-mono">{fmt(totalCompras)}</div>
                                    </div>
                                </div>
                                <div className="erp-metric-card overflow-hidden">
                                    <div className="h-0.5 bg-[#f2b635]" />
                                    <div className="p-3.5 text-center">
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Abonos</div>
                                        <div className="text-lg font-black text-slate-700 mt-1 font-mono">{fmt(totalAbonos)}</div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-[#5e1318] bg-[#7f1218] overflow-hidden">
                                    <div className="h-0.5 bg-[#f2b635]" />
                                    <div className="p-3.5 text-center">
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#f2b635]">Total del Día</div>
                                        <div className="text-lg font-black text-white mt-1 font-mono">{fmt(totalGeneral)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla */}
                            <div className="space-y-3 md:hidden">
                                {registros.length === 0 ? (
                                    <div className="erp-empty-state px-5 py-10 text-center text-slate-400">
                                        <Icon path={Icons.alertCircle} className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                        <p className="text-sm font-medium">No hay registros para esta fecha</p>
                                    </div>
                                ) : (
                                    registros.map((reg) => (
                                        <div key={reg.id} className="erp-mobile-record p-4">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                        {reg.timestamp?.toDate?.().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) || '--:--'}
                                                    </div>
                                                    <div className="mt-1 text-sm font-bold text-slate-800">{reg.descripcion}</div>
                                                </div>
                                                <Badge variant={reg.tipo === 'Gasto' ? 'danger' : reg.tipo === 'ABONO' ? 'warning' : 'purple'}>
                                                    {reg.tipo}
                                                </Badge>
                                            </div>
                                            <div className="erp-mobile-keyvalue">
                                                <div className="erp-mobile-keyvalue-row">
                                                    <span>Categoria</span>
                                                    <span>{reg.categoria || '—'}</span>
                                                </div>
                                                <div className="erp-mobile-keyvalue-row">
                                                    <span>Subcategoria</span>
                                                    <span>{reg.subcategoria || reg.subcategory || '—'}</span>
                                                </div>
                                                <div className="erp-mobile-keyvalue-row">
                                                    <span>Metodo</span>
                                                    <span>{getPaymentMethodLabel(reg.paymentMethod)}</span>
                                                </div>
                                                <div className="erp-mobile-keyvalue-row">
                                                    <span>Monto</span>
                                                    <span className="erp-mono font-extrabold text-[#16222d]">{fmt(reg.monto)}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleEliminar(reg)}
                                                className="erp-pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#a81d24]"
                                                disabled={loading}
                                            >
                                                <Icon path={Icons.trash} className="h-4 w-4" />
                                                Eliminar registro
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="erp-table-shell hidden overflow-x-auto md:block">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Hora</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Descripción</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Tipo</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Categoría</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Subcategoria</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Metodo</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400">Monto</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400 no-print">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {registros.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-4 py-10 text-center text-slate-400">
                                                    <Icon path={Icons.alertCircle} className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                                    <p className="text-sm">No hay registros para esta fecha</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            registros.map(reg => (
                                                <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                        {reg.timestamp?.toDate?.().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) || '--:--'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{reg.descripcion}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={reg.tipo === 'Gasto' ? 'danger' : reg.tipo === 'ABONO' ? 'warning' : 'purple'}>
                                                            {reg.tipo}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">{reg.categoria || '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">{reg.subcategoria || reg.subcategory || '—'}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-slate-500">{getPaymentMethodLabel(reg.paymentMethod)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono">{fmt(reg.monto)}</td>
                                                    <td className="px-4 py-3 text-center no-print">
                                                        <button
                                                            onClick={() => handleEliminar(reg)}
                                                            className="p-1.5 text-slate-400 hover:text-[#a81d24] hover:bg-[#fff0f0] rounded-md transition-colors"
                                                            disabled={loading}
                                                        >
                                                            <Icon path={Icons.trash} className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                                        <tr>
                                            <td colSpan="6" className="px-4 py-3 font-semibold text-slate-700 uppercase text-xs tracking-widest">Total del Día</td>
                                            <td className="px-4 py-3 text-right font-black text-lg text-[#7f1218] font-mono">{fmt(totalGeneral)}</td>
                                            <td className="no-print"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
