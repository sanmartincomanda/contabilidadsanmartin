// src/components/AccountsPayable.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, doc, Timestamp, runTransaction, 
    query, orderBy, limit, getDocs, deleteDoc 
} from 'firebase/firestore';
import { fmt } from '../constants';

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
    checkSquare: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    square: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
};

// --- ANIMACIONES CSS ---
const FadeIn = ({ children, delay = 0, className = "" }) => (
    <div 
        className={`animate-fade-in ${className}`}
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
        {children}
    </div>
);

const SlideIn = ({ children, className = "" }) => (
    <div className={`animate-slide-in ${className}`}>
        {children}
    </div>
);

// --- COMPONENTES UI ---
const Card = ({ title, children, className = "", right, icon }) => (
    <div className={`rounded-2xl shadow-lg border border-slate-200/60 bg-white/80 backdrop-blur-xl overflow-hidden ${className}`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon path={Icons[icon]} className="w-5 h-5 text-blue-600" />
                    </div>
                )}
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
            {right}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const Button = ({ children, variant = 'primary', className = '', disabled, ...props }) => {
    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30',
        success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-slate-200',
        outline: 'bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold'
    };
    
    return (
        <button 
            disabled={disabled}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Input = ({ label, icon, className = '', ...props }) => (
    <div className="space-y-2">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
        <div className="relative group">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
            <input 
                className={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 ${icon ? 'pl-11' : ''} ${className}`}
                {...props}
            />
        </div>
    </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="space-y-2">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
        <div className="relative">
            <select 
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 appearance-none cursor-pointer"
                {...props}
            >
                {options}
            </select>
            <Icon path={Icons.chevronRight} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
        </div>
    </div>
);

const Badge = ({ children, variant = 'default' }) => {
    const variants = {
        default: 'bg-slate-100 text-slate-600',
        danger: 'bg-red-100 text-red-700 border border-red-200',
        warning: 'bg-amber-100 text-amber-700 border border-amber-200',
        success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        info: 'bg-blue-100 text-blue-700 border border-blue-200'
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${variants[variant]}`}>
            {children}
        </span>
    );
};

// --- COMPONENTE PRINCIPAL ---
export function AccountsPayable({ data }) {
    const [activeTab, setActiveTab] = useState('Estado de Cuenta');
    const [loading, setLoading] = useState(false);
    const [nuevoProveedor, setNuevoProveedor] = useState('');
    
    const facturas = data.cuentas_por_pagar || [];
    const abonos = data.abonos_pagar || [];
    const listaProveedores = data.proveedores || [];

    const SUCURSALES = ["Carnes Amparito", "CSM Granada", "CSM Masaya", "CEDI", "CSM Granada Inmaculada"];

    const [facturaForm, setFacturaForm] = useState({
        fecha: new Date().toISOString().substring(0, 10),
        proveedor: '',
        sucursal: '',
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
        const hoy = new Date();
        hoy.setHours(0,0,0,0);

        const facturasOrdenadas = [...facturas]
            .filter(f => f.estado !== 'pagado')
            .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

        facturasOrdenadas.forEach(f => {
            if (!groups[f.proveedor]) {
                groups[f.proveedor] = { saldoTotal: 0, items: [] };
            }
            const yaAbonado = Number((f.monto - (f.saldo || 0)).toFixed(2));
            groups[f.proveedor].items.push({ ...f, yaAbonado });
            groups[f.proveedor].saldoTotal += (f.saldo || 0);
            totalGeneral += (f.saldo || 0);

            if (f.vencimiento) {
                const venc = new Date(f.vencimiento);
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
    }, [facturas]);

    // --- HANDLERS ---
    const handleSaveFactura = useCallback(async (e) => {
        e.preventDefault();
        const montoNum = parseFloat(facturaForm.monto);
        if (!facturaForm.proveedor || !facturaForm.sucursal || isNaN(montoNum) || montoNum <= 0) {
            return alert("Por favor complete Proveedor, Sucursal y Monto.");
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'cuentas_por_pagar'), {
                fecha: facturaForm.fecha,
                proveedor: facturaForm.proveedor,
                sucursal: facturaForm.sucursal,
                numero: facturaForm.numero?.trim() || "S/N",
                vencimiento: facturaForm.vencimiento || "",
                monto: montoNum,
                saldo: montoNum,
                estado: 'pendiente',
                timestamp: Timestamp.now()
            });
            setFacturaForm({ ...facturaForm, numero: '', monto: '', vencimiento: '', sucursal: '' });
        } catch (error) { 
            console.error(error);
            alert("Error al guardar");
        }
        setLoading(false);
    }, [facturaForm]);

    // --- MODAL ABONOS ---
    const [showModalAbono, setShowModalAbono] = useState(false);
    const [selectedFacturas, setSelectedFacturas] = useState([]);
    const [montoAbono, setMontoAbono] = useState('');
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
    const [montoPrevisualizado, setMontoPrevisualizado] = useState(0);

    // Calcular monto previsualizado
    useEffect(() => {
        const facturasDelProveedor = facturasPorProveedor[proveedorSeleccionado]?.items || [];
        const totalSeleccionado = facturasDelProveedor
            .filter(f => selectedFacturas.includes(f.id))
            .reduce((sum, f) => sum + (f.saldo || 0), 0);
        setMontoPrevisualizado(totalSeleccionado);
    }, [selectedFacturas, proveedorSeleccionado, facturasPorProveedor]);

    const handleSeleccionarTodas = () => {
        const facturasDelProveedor = facturasPorProveedor[proveedorSeleccionado]?.items || [];
        const todosLosIds = facturasDelProveedor.map(f => f.id);
        const todasSeleccionadas = selectedFacturas.length === todosLosIds.length;
        
        if (todasSeleccionadas) {
            setSelectedFacturas([]);
        } else {
            setSelectedFacturas(todosLosIds);
        }
    };

    const handleAbonarMontoSeleccionado = () => {
        setMontoAbono(montoPrevisualizado.toFixed(2));
    };

    const handleRealizarAbono = useCallback(async () => {
        const montoTotalAbono = parseFloat(montoAbono);
        if (isNaN(montoTotalAbono) || montoTotalAbono <= 0 || selectedFacturas.length === 0) return;

        setLoading(true);
        try {
            const q = query(collection(db, 'abonos_pagar'), orderBy('secuencia', 'desc'), limit(1));
            const snap = await getDocs(q);
            const nuevaSecuencia = snap.empty ? 1 : (snap.docs[0].data().secuencia + 1);

            await runTransaction(db, async (transaction) => {
                let restante = montoTotalAbono;
                const facturasAfectadas = [];
                const refsYDocs = [];

                for (const fId of selectedFacturas) {
                    const ref = doc(db, 'cuentas_por_pagar', fId);
                    const snapshot = await transaction.get(ref);
                    if (!snapshot.exists()) throw "Una factura no existe";
                    refsYDocs.push({ ref, snapshot, data: snapshot.data() });
                }

                refsYDocs.sort((a, b) => new Date(a.data.fecha) - new Date(b.data.fecha));

                for (const item of refsYDocs) {
                    if (restante <= 0) break;
                    const pagoParaEstaFactura = Math.min(item.data.saldo, restante);
                    const nuevoSaldo = Number((item.data.saldo - pagoParaEstaFactura).toFixed(2));

                    transaction.update(item.ref, {
                        saldo: nuevoSaldo,
                        estado: nuevoSaldo <= 0 ? 'pagado' : 'parcial'
                    });

                    facturasAfectadas.push({ id: item.snapshot.id, montoAbonado: pagoParaEstaFactura });
                    restante = Number((restante - pagoParaEstaFactura).toFixed(2));
                }

                transaction.set(doc(collection(db, 'abonos_pagar')), {
                    fecha: new Date().toISOString().substring(0, 10),
                    montoTotal: montoTotalAbono,
                    proveedor: proveedorSeleccionado,
                    secuencia: nuevaSecuencia,
                    detalleAfectado: facturasAfectadas,
                    timestamp: Timestamp.now()
                });
            });
            setShowModalAbono(false);
            setMontoAbono('');
            setSelectedFacturas([]);
            setMontoPrevisualizado(0);
        } catch (e) { 
            alert("Error: " + e.message); 
        }
        setLoading(false);
    }, [montoAbono, selectedFacturas, proveedorSeleccionado]);

    const handleDeleteAbono = useCallback(async (abonoDoc) => {
        if (!window.confirm(`¿Anular abono #${abonoDoc.secuencia}?`)) return;
        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const facturasParaActualizar = [];
                for (const item of abonoDoc.detalleAfectado || []) {
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
                transaction.delete(doc(db, 'abonos_pagar', abonoDoc.id));
            });
        } catch (e) { 
            alert("Error: " + e.message); 
        }
        setLoading(false);
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
        }
        setLoading(false);
    }, [nuevoProveedor]);

    // --- HELPERS ---
    const getVencimientoInfo = (fechaVenc) => {
        if (!fechaVenc) return { text: 'Sin vencimiento', variant: 'default', days: null };
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const venc = new Date(fechaVenc);
        const diffDays = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { text: `${Math.abs(diffDays)} días vencida`, variant: 'danger', days: diffDays };
        if (diffDays === 0) return { text: 'Vence hoy', variant: 'warning', days: diffDays };
        if (diffDays <= 3) return { text: `${diffDays} días por vencer`, variant: 'warning', days: diffDays };
        return { text: `${diffDays} días restantes`, variant: 'success', days: diffDays };
    };

    const tabs = [
        { id: 'Ingresar Factura', icon: 'plus', label: 'Nueva Factura' },
        { id: 'Estado de Cuenta', icon: 'trendingDown', label: 'Estado' },
        { id: 'Historial Abonos', icon: 'receipt', label: 'Abonos' },
        { id: 'Base de Proveedores', icon: 'users', label: 'Proveedores' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4 md:p-8">
            {/* CSS PARA ANIMACIONES */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slide-in {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out; }
                .animate-slide-in { animation: slide-in 0.4s ease-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <FadeIn className="mb-8">
                    <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                        Cuentas por <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">Pagar</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Gestión de facturas y pagos a proveedores</p>
                </FadeIn>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <FadeIn delay={100} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Saldo Total</span>
                            <Icon path={Icons.trendingDown} className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="text-3xl font-black">{fmt(saldoTotalGeneral)}</div>
                        <div className="text-slate-400 text-xs mt-1">{stats.count} facturas pendientes</div>
                    </FadeIn>

                    <FadeIn delay={200} className="bg-white rounded-2xl p-6 border border-red-100 shadow-lg shadow-red-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-red-600 text-sm font-bold uppercase tracking-wider">Vencidas</span>
                            <Icon path={Icons.alertCircle} className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-3xl font-black text-red-600">{fmt(stats.vencidas)}</div>
                        <div className="text-red-400 text-xs mt-1">Requieren atención inmediata</div>
                    </FadeIn>

                    <FadeIn delay={300} className="bg-white rounded-2xl p-6 border border-amber-100 shadow-lg shadow-amber-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-amber-600 text-sm font-bold uppercase tracking-wider">Por Vencer (3d)</span>
                            <Icon path={Icons.calendar} className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="text-3xl font-black text-amber-600">{fmt(stats.porVencer)}</div>
                        <div className="text-amber-400 text-xs mt-1">Próximas a vencer</div>
                    </FadeIn>
                </div>

                {/* NAVEGACIÓN TABS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                                    activeTab === tab.id 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Icon path={Icons[tab.icon]} className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENIDO TABS */}
                <div className="relative">
                    {activeTab === 'Ingresar Factura' && (
                        <SlideIn className="max-w-2xl mx-auto">
                            <Card title="Registrar Nueva Factura" icon="fileText">
                                <form onSubmit={handleSaveFactura} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Select
                                            label="Proveedor"
                                            value={facturaForm.proveedor}
                                            onChange={e => setFacturaForm({...facturaForm, proveedor: e.target.value})}
                                            required
                                            options={
                                                <>
                                                    <option value="">Seleccionar proveedor...</option>
                                                    {listaProveedores.sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(p => (
                                                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                                    ))}
                                                </>
                                            }
                                        />
                                        <Select
                                            label="Sucursal Destino"
                                            value={facturaForm.sucursal}
                                            onChange={e => setFacturaForm({...facturaForm, sucursal: e.target.value})}
                                            required
                                            options={
                                                <>
                                                    <option value="">Seleccionar sucursal...</option>
                                                    {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </>
                                            }
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Fecha Emisión"
                                            type="date"
                                            icon="calendar"
                                            value={facturaForm.fecha}
                                            onChange={e => setFacturaForm({...facturaForm, fecha: e.target.value})}
                                            required
                                        />
                                        <Input
                                            label="Fecha Vencimiento"
                                            type="date"
                                            icon="calendar"
                                            value={facturaForm.vencimiento}
                                            onChange={e => setFacturaForm({...facturaForm, vencimiento: e.target.value})}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="N° Factura"
                                            icon="fileText"
                                            placeholder="Ej: 001-001-000000001"
                                            value={facturaForm.numero}
                                            onChange={e => setFacturaForm({...facturaForm, numero: e.target.value})}
                                        />
                                        <Input
                                            label="Monto Total"
                                            type="number"
                                            step="0.01"
                                            icon="creditCard"
                                            placeholder="0.00"
                                            className="text-2xl font-black text-blue-600"
                                            value={facturaForm.monto}
                                            onChange={e => setFacturaForm({...facturaForm, monto: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <Button type="submit" disabled={loading} className="w-full py-4 text-lg">
                                        {loading ? 'Guardando...' : 'Guardar Factura'}
                                    </Button>
                                </form>
                            </Card>
                        </SlideIn>
                    )}

                    {activeTab === 'Estado de Cuenta' && (
                        <div className="space-y-6">
                            {Object.entries(facturasPorProveedor).map(([prov, data], idx) => (
                                <FadeIn key={prov} delay={idx * 100}>
                                    <Card 
                                        title={prov} 
                                        icon="building"
                                        right={
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-red-600">{fmt(data.saldoTotal)}</div>
                                                <div className="text-xs text-slate-400 font-bold uppercase">{data.items.length} facturas</div>
                                            </div>
                                        }
                                    >
                                        <div className="mb-4 flex justify-end">
                                            <Button 
                                                variant="success" 
                                                onClick={() => { 
                                                    setProveedorSeleccionado(prov); 
                                                    setShowModalAbono(true); 
                                                }}
                                                className="flex items-center gap-2"
                                            >
                                                <Icon path={Icons.creditCard} className="w-4 h-4" />
                                                Realizar Abono
                                            </Button>
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-4 text-left font-bold text-slate-600">Factura</th>
                                                        <th className="p-4 text-left font-bold text-slate-600">Sucursal</th>
                                                        <th className="p-4 text-left font-bold text-slate-600">Emisión</th>
                                                        <th className="p-4 text-left font-bold text-slate-600">Vencimiento</th>
                                                        <th className="p-4 text-right font-bold text-slate-600">Monto</th>
                                                        <th className="p-4 text-right font-bold text-slate-600">Abonado</th>
                                                        <th className="p-4 text-right font-bold text-slate-600">Saldo</th>
                                                        <th className="p-4 text-center font-bold text-slate-600">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {data.items.map(f => {
                                                        const vencInfo = getVencimientoInfo(f.vencimiento);
                                                        return (
                                                            <tr key={f.id} className="hover:bg-slate-50/80 transition-colors group">
                                                                <td className="p-4 font-bold text-slate-800">{f.numero}</td>
                                                                <td className="p-4">
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                                                                        <Icon path={Icons.building} className="w-3 h-3" />
                                                                        {f.sucursal}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-slate-600">{f.fecha}</td>
                                                                <td className="p-4">
                                                                    <Badge variant={vencInfo.variant}>
                                                                        {vencInfo.text}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-4 text-right font-medium text-slate-600">{fmt(f.monto)}</td>
                                                                <td className="p-4 text-right font-bold text-emerald-600">
                                                                    {f.yaAbonado > 0 ? fmt(f.yaAbonado) : '-'}
                                                                </td>
                                                                <td className="p-4 text-right font-black text-red-600 text-lg">{fmt(f.saldo)}</td>
                                                                <td className="p-4 text-center">
                                                                    <button 
                                                                        onClick={() => { 
                                                                            if(window.confirm('¿Eliminar esta factura permanentemente?')) 
                                                                                deleteDoc(doc(db, 'cuentas_por_pagar', f.id));
                                                                        }}
                                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <Icon path={Icons.trash} className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </FadeIn>
                            ))}
                            
                            {Object.keys(facturasPorProveedor).length === 0 && (
                                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                                    <Icon path={Icons.checkCircle} className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-slate-600">Todo al día</h3>
                                    <p className="text-slate-400">No hay facturas pendientes por pagar</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Historial Abonos' && (
                        <SlideIn>
                            <Card title="Historial de Abonos" icon="receipt">
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="p-4 text-left font-bold text-slate-600">Recibo #</th>
                                                <th className="p-4 text-left font-bold text-slate-600">Fecha</th>
                                                <th className="p-4 text-left font-bold text-slate-600">Proveedor</th>
                                                <th className="p-4 text-right font-bold text-slate-600">Monto Abonado</th>
                                                <th className="p-4 text-center font-bold text-slate-600">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {abonos.sort((a,b) => b.secuencia - a.secuencia).map(a => (
                                                <tr key={a.id} className="hover:bg-slate-50">
                                                    <td className="p-4 font-mono font-bold text-blue-600 text-lg">#{a.secuencia}</td>
                                                    <td className="p-4 text-slate-600">{a.fecha}</td>
                                                    <td className="p-4 font-bold text-slate-800">{a.proveedor}</td>
                                                    <td className="p-4 text-right font-black text-emerald-600 text-lg">{fmt(a.montoTotal)}</td>
                                                    <td className="p-4 text-center">
                                                        <button 
                                                            onClick={() => handleDeleteAbono(a)}
                                                            className="text-red-500 hover:text-red-700 font-bold text-xs uppercase px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            Anular
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </SlideIn>
                    )}

                    {activeTab === 'Base de Proveedores' && (
                        <SlideIn className="max-w-2xl mx-auto">
                            <Card title="Directorio de Proveedores" icon="users">
                                <form onSubmit={handleAddProveedor} className="flex gap-3 mb-6">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder="Nombre del nuevo proveedor..."
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all"
                                            value={nuevoProveedor}
                                            onChange={e => setNuevoProveedor(e.target.value)}
                                        />
                                    </div>
                                    <Button type="submit" disabled={loading || !nuevoProveedor.trim()}>
                                        <Icon path={Icons.plus} className="w-5 h-5" />
                                    </Button>
                                </form>

                                <div className="space-y-2">
                                    {listaProveedores.sort((a,b)=>a.nombre.localeCompare(b.nombre)).map((p, idx) => (
                                        <FadeIn key={p.id} delay={idx * 50}>
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                        {p.nombre.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{p.nombre}</span>
                                                </div>
                                                <button
                                                    onClick={() => deleteDoc(doc(db, 'proveedores', p.id))}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Icon path={Icons.trash} className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </FadeIn>
                                    ))}
                                </div>
                            </Card>
                        </SlideIn>
                    )}
                </div>

                {/* MODAL ABONO */}
                {showModalAbono && (
                    <div 
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
                        onClick={() => setShowModalAbono(false)}
                    >
                        <div 
                            className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-in"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">Realizar Abono</h3>
                                    <p className="text-slate-500 font-medium">{proveedorSeleccionado}</p>
                                </div>
                                <button 
                                    onClick={() => setShowModalAbono(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <Icon path={Icons.x} className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            {/* RESUMEN DE SELECCIÓN */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border-2 border-blue-200 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Icon path={Icons.calculator} className="w-5 h-5 text-blue-600" />
                                        <span className="font-bold text-slate-700">Resumen de Selección</span>
                                    </div>
                                    <button
                                        onClick={handleSeleccionarTodas}
                                        className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        {selectedFacturas.length === (facturasPorProveedor[proveedorSeleccionado]?.items || []).length ? (
                                            <><Icon path={Icons.checkSquare} className="w-4 h-4" /> Desmarcar todas</>
                                        ) : (
                                            <><Icon path={Icons.square} className="w-4 h-4" /> Seleccionar todas</>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Facturas Seleccionadas</div>
                                        <div className="text-2xl font-black text-blue-600">
                                            {selectedFacturas.length} <span className="text-sm font-medium text-slate-400">/ {facturasPorProveedor[proveedorSeleccionado]?.items.length || 0}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Monto Total Seleccionado</div>
                                        <div className="text-2xl font-black text-emerald-600">
                                            {fmt(montoPrevisualizado)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LISTA DE FACTURAS */}
                            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {facturasPorProveedor[proveedorSeleccionado]?.items.map(f => (
                                    <label
                                        key={f.id}
                                        className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            selectedFacturas.includes(f.id)
                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                : 'border-slate-200 hover:border-blue-300 bg-white hover:shadow-sm'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-4 transition-colors ${
                                            selectedFacturas.includes(f.id)
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-slate-300 bg-white'
                                        }`}>
                                            {selectedFacturas.includes(f.id) && <Icon path={Icons.checkSquare} className="w-4 h-4 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedFacturas.includes(f.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedFacturas([...selectedFacturas, f.id]);
                                                } else {
                                                    setSelectedFacturas(selectedFacturas.filter(id => id !== f.id));
                                                }
                                            }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-slate-800">Factura #{f.numero}</span>
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">{f.sucursal}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">Emisión: {f.fecha}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-red-600 text-lg">{fmt(f.saldo)}</div>
                                            <div className="text-xs text-slate-400">Saldo pendiente</div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {/* MONTO A ABONAR */}
                            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold uppercase text-slate-500">Monto a Abonar</label>
                                    {selectedFacturas.length > 0 && (
                                        <button
                                            onClick={handleAbonarMontoSeleccionado}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <Icon path={Icons.calculator} className="w-3 h-3" />
                                            Abonar monto seleccionado ({fmt(montoPrevisualizado)})
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">C$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-white border-2 border-slate-200 rounded-xl pl-12 pr-4 py-4 text-3xl font-black text-blue-600 text-center outline-none focus:border-blue-500 focus:shadow-lg transition-all"
                                        value={montoAbono}
                                        onChange={e => setMontoAbono(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                {parseFloat(montoAbono) > montoPrevisualizado && (
                                    <div className="mt-2 text-xs text-amber-600 font-bold flex items-center gap-1">
                                        <Icon path={Icons.alertCircle} className="w-4 h-4" />
                                        El monto ingresado supera el total seleccionado. El excedente quedará como saldo a favor.
                                    </div>
                                )}
                            </div>

                            {/* BOTONES */}
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setShowModalAbono(false);
                                        setMontoAbono('');
                                        setSelectedFacturas([]);
                                        setMontoPrevisualizado(0);
                                    }}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="success"
                                    onClick={handleRealizarAbono}
                                    disabled={loading || !montoAbono || selectedFacturas.length === 0}
                                    className="flex-[2] flex items-center justify-center gap-2"
                                >
                                    <Icon path={Icons.arrowRightCircle} className="w-5 h-5" />
                                    {loading ? 'Procesando...' : `Confirmar Pago ${montoAbono ? fmt(parseFloat(montoAbono)) : ''}`}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}