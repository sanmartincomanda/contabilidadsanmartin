// src/components/GastosDiarios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, Timestamp, getDocs, doc, deleteDoc 
} from 'firebase/firestore';
import { fmt } from '../constants';

// --- ICONOS SVG INLINE ---
const Icons = {
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    fileText: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    alertCircle: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    cash: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    printer: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
    refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    chevronRight: "M9 5l7 7-7 7"
};

const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

// --- COMPONENTES UI ---

const FadeIn = ({ children, delay = 0, className = "" }) => (
    <div className={`animate-fade-in ${className}`} style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
        {children}
    </div>
);

const Card = ({ title, children, className = "", right, icon, gradient = false }) => (
    <div className={`rounded-2xl shadow-lg border border-slate-200/60 bg-white overflow-hidden ${className}`}>
        <div className={`flex justify-between items-center px-6 py-4 border-b border-slate-100 ${gradient ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className={`p-2 rounded-lg ${gradient ? 'bg-white/10' : 'bg-blue-100'}`}>
                        <Icon path={Icons[icon]} className={`w-5 h-5 ${gradient ? 'text-white' : 'text-blue-600'}`} />
                    </div>
                )}
                <div>
                    <h3 className={`text-lg font-bold ${gradient ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
                </div>
            </div>
            {right}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const Button = ({ children, variant = 'primary', className = '', disabled, size = 'md', ...props }) => {
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2', lg: 'px-6 py-3' };
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        purple: 'bg-purple-600 hover:bg-purple-700 text-white',
        sky: 'bg-sky-600 hover:bg-sky-700 text-white',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-slate-200',
        dark: 'bg-slate-800 hover:bg-slate-900 text-white'
    };
    
    return (
        <button disabled={disabled} className={`${sizes[size]} rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Input = ({ label, icon, type = "text", className = '', ...props }) => (
    <div className="space-y-1">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
        <div className="relative group">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
            <input type={type} className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${icon ? 'pl-10' : ''} ${className}`} {...props} />
        </div>
    </div>
);

const Select = ({ label, icon, options, ...props }) => (
    <div className="space-y-1">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
        <div className="relative">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
            <select className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer ${icon ? 'pl-10' : ''}`} {...props}>
                {options}
            </select>
            <Icon path={Icons.chevronRight} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
        </div>
    </div>
);

const Badge = ({ children, variant = 'default' }) => {
    const variants = {
        default: 'bg-slate-100 text-slate-600',
        success: 'bg-emerald-100 text-emerald-700',
        danger: 'bg-rose-100 text-rose-700',
        warning: 'bg-amber-100 text-amber-700',
        info: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${variants[variant]}`}>{children}</span>;
};

// --- COMPONENTE PRINCIPAL: GASTOS DIARIOS ---

export default function GastosDiarios({ categories = [], branches = [] }) {
    const [activeTab, setActiveTab] = useState('registro');
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Estados del formulario
    const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
    const [caja, setCaja] = useState('Caja Carnes Amparito');
    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [tipo, setTipo] = useState('Gasto');
    const [categoriaId, setCategoriaId] = useState('');
    const [sucursal, setSucursal] = useState(branches?.[0]?.id || '');

    // Estados para el historial/reporte
    const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().substring(0, 10));
    const [filtroCaja, setFiltroCaja] = useState('todas');
    const [registros, setRegistros] = useState([]);

    const CAJAS = ['Caja Carnes Amparito', 'Caja CSM Granada'];

    // Cargar registros de gastos diarios - SIN ÍNDICES (funciona inmediatamente)
    const cargarRegistros = useCallback(async () => {
        setLoading(true);
        try {
            // Consulta SIMPLE: sin where ni orderBy que requieran índice
            // Solo obtenemos todos los documentos y filtramos/ordenamos en JavaScript
            const snapshot = await getDocs(collection(db, 'gastosDiarios'));
            
            let docs = snapshot.docs.map(d => ({ 
                id: d.id, 
                ...d.data(),
                timestamp: d.data().timestamp || null
            }));
            
            // Ordenar por timestamp en JavaScript (más reciente primero)
            docs.sort((a, b) => {
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });
            
            // Filtrar por fecha en JavaScript
            if (filtroFecha) {
                docs = docs.filter(d => d.fecha === filtroFecha);
            }
            
            // Filtrar por caja en JavaScript
            if (filtroCaja !== 'todas') {
                docs = docs.filter(d => d.caja === filtroCaja);
            }
            
            setRegistros(docs);
        } catch (error) {
            console.error('Error cargando registros:', error);
            alert('Error al cargar los registros: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [filtroFecha, filtroCaja]);

    useEffect(() => {
        if (activeTab === 'historial') {
            cargarRegistros();
        }
    }, [activeTab, cargarRegistros, refreshKey]);

    // Guardar nuevo registro
    const handleSubmit = async (e) => {
        e.preventDefault();
        const numMonto = Number(monto);
        if (isNaN(numMonto) || numMonto <= 0) return alert('Monto inválido.');
        if (!descripcion || !sucursal) return alert('Complete todos los campos.');
        if (tipo === 'Gasto' && !categoriaId) return alert('Categoría requerida para gastos.');

        setLoading(true);
        try {
            const categoriaNombre = tipo === 'Gasto' ? categories.find(c => c.id === categoriaId)?.name : 'Compra';
            
            const docRef = await addDoc(collection(db, 'gastosDiarios'), {
                fecha, 
                caja, 
                descripcion, 
                monto: numMonto, 
                tipo, 
                categoria: categoriaNombre || null, 
                sucursal,
                timestamp: Timestamp.now()
            });

            if (tipo === 'Gasto') {
                await addDoc(collection(db, 'gastos'), {
                    date: fecha,
                    description: `${descripcion} (Caja: ${caja})`,
                    amount: numMonto,
                    category: categoriaNombre,
                    branch: sucursal,
                    timestamp: Timestamp.now(),
                    is_conciled: false,
                    origen: 'gastosDiarios',
                    gastoDiarioId: docRef.id
                });
            }

            setDescripcion(''); 
            setMonto(''); 
            setCategoriaId('');
            
            alert(`${tipo} registrado correctamente`);
            setRefreshKey(prev => prev + 1);
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Eliminar registro
    const handleEliminar = async (id, tipoRegistro) => {
        if (!window.confirm('¿Eliminar este registro?')) return;
        
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'gastosDiarios', id));
            
            if (tipoRegistro === 'Gasto') {
                // Buscar y eliminar el gasto relacionado en la colección 'gastos'
                const gastosSnapshot = await getDocs(collection(db, 'gastos'));
                const gastosRelacionados = gastosSnapshot.docs.filter(
                    doc => doc.data().gastoDiarioId === id
                );
                
                for (const gastoDoc of gastosRelacionados) {
                    await deleteDoc(doc(db, 'gastos', gastoDoc.id));
                }
            }
            
            cargarRegistros();
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar');
        } finally {
            setLoading(false);
        }
    };

    // Calcular totales
    const totalGastos = registros.filter(r => r.tipo === 'Gasto').reduce((sum, r) => sum + (r.monto || 0), 0);
    const totalCompras = registros.filter(r => r.tipo === 'Compra').reduce((sum, r) => sum + (r.monto || 0), 0);
    const totalGeneral = totalGastos + totalCompras;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out; }
                @media print { .no-print { display: none !important; } }
            `}</style>

            <div className="max-w-7xl mx-auto">
                <FadeIn className="mb-8">
                    <h1 className="text-4xl font-black text-slate-800 mb-2">
                        Gastos <span className="text-rose-600">Diarios</span>
                    </h1>
                    <p className="text-slate-500">Registro de caja diaria y compras</p>
                </FadeIn>

                {/* TABS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveTab('registro')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                                activeTab === 'registro' 
                                    ? 'bg-rose-600 text-white shadow-lg' 
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Icon path={Icons.receipt} className="w-4 h-4" />
                            Nuevo Registro
                        </button>
                        <button
                            onClick={() => setActiveTab('historial')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                                activeTab === 'historial' 
                                    ? 'bg-slate-800 text-white shadow-lg' 
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Icon path={Icons.calendar} className="w-4 h-4" />
                            Reporte / Historial
                        </button>
                    </div>
                </div>

                {activeTab === 'registro' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* FORMULARIO */}
                        <FadeIn>
                            <Card title="Nuevo Registro de Caja" icon="receipt" gradient={true}>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Select 
                                            label="Caja" 
                                            icon="cash" 
                                            value={caja} 
                                            onChange={e => setCaja(e.target.value)} 
                                            options={CAJAS.map(c => <option key={c} value={c}>{c}</option>)} 
                                        />
                                        <Input 
                                            label="Fecha" 
                                            type="date" 
                                            icon="calendar" 
                                            value={fecha} 
                                            onChange={e => setFecha(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    
                                    <Input 
                                        label="Descripción" 
                                        icon="fileText" 
                                        placeholder="Ej: Compra de víveres, pago de servicio..." 
                                        value={descripcion} 
                                        onChange={e => setDescripcion(e.target.value)} 
                                        required 
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input 
                                            label="Monto" 
                                            type="number" 
                                            step="0.01" 
                                            icon="dollar" 
                                            placeholder="0.00" 
                                            className="text-lg font-bold text-rose-600" 
                                            value={monto} 
                                            onChange={e => setMonto(e.target.value)} 
                                            required 
                                        />
                                        <Select 
                                            label="Tipo" 
                                            icon="receipt" 
                                            value={tipo} 
                                            onChange={e => { 
                                                setTipo(e.target.value); 
                                                if (e.target.value === 'Compra') setCategoriaId(''); 
                                            }} 
                                            options={
                                                <>
                                                    <option value="Gasto">Gasto</option>
                                                    <option value="Compra">Compra</option>
                                                </>
                                            } 
                                        />
                                    </div>
                                    
                                    {tipo === 'Gasto' && (
                                        <Select 
                                            label="Categoría" 
                                            icon="tag" 
                                            value={categoriaId} 
                                            onChange={e => setCategoriaId(e.target.value)} 
                                            required 
                                            options={
                                                <>
                                                    <option value="">Seleccionar...</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </>
                                            } 
                                        />
                                    )}
                                    
                                    <Select 
                                        label="Sucursal" 
                                        icon="building" 
                                        value={sucursal} 
                                        onChange={e => setSucursal(e.target.value)} 
                                        required 
                                        options={
                                            <>
                                                <option value="">Seleccionar...</option>
                                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </>
                                        } 
                                    />
                                    
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                        <span className="font-bold">Nota:</span> Los <b>Gastos</b> afectan el Estado de Resultados y se registran también en el módulo de Gastos. Las <b>Compras</b> solo quedan aquí.
                                    </div>
                                    
                                    <Button 
                                        type="submit" 
                                        variant="danger" 
                                        disabled={loading} 
                                        className="w-full"
                                    >
                                        {loading ? 'Guardando...' : `Registrar ${tipo}`}
                                    </Button>
                                </form>
                            </Card>
                        </FadeIn>

                        {/* INSTRUCCIONES / INFO */}
                        <FadeIn delay={100}>
                            <Card title="Información" icon="info">
                                <div className="space-y-4 text-sm text-slate-600">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-bold text-blue-800 mb-2">¿Qué es un Gasto Diario?</h4>
                                        <p>Los gastos diarios son salidas de caja que se registran el mismo día. Se diferencian en:</p>
                                        <ul className="list-disc ml-5 mt-2 space-y-1">
                                            <li><b>Gasto:</b> Afecta el estado de resultados (ej: servicios, suministros)</li>
                                            <li><b>Compra:</b> Solo registro de caja (ej: compra de mercancía pagada al contado)</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                        <h4 className="font-bold text-emerald-800 mb-2">Flujo de trabajo recomendado:</h4>
                                        <ol className="list-decimal ml-5 space-y-1">
                                            <li>Selecciona la caja correcta</li>
                                            <li>Ingresa todos los gastos del día</li>
                                            <li>Revisa el reporte en la pestaña "Reporte / Historial"</li>
                                            <li>Imprime el cierre de caja si es necesario</li>
                                        </ol>
                                    </div>
                                </div>
                            </Card>
                        </FadeIn>
                    </div>
                ) : (
                    <FadeIn>
                        <Card title="Reporte de Cierre de Caja" icon="printer">
                            <div className="space-y-6">
                                {/* Filtros */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                        <Input 
                                            label="Fecha" 
                                            type="date" 
                                            icon="calendar" 
                                            value={filtroFecha} 
                                            onChange={e => setFiltroFecha(e.target.value)} 
                                        />
                                        <Select 
                                            label="Caja" 
                                            icon="cash" 
                                            value={filtroCaja} 
                                            onChange={e => setFiltroCaja(e.target.value)} 
                                            options={
                                                <>
                                                    <option value="todas">Todas las cajas</option>
                                                    {CAJAS.map(c => <option key={c} value={c}>{c}</option>)}
                                                </>
                                            } 
                                        />
                                        <Button 
                                            onClick={() => window.print()} 
                                            variant="dark" 
                                            className="flex items-center justify-center gap-2"
                                        >
                                            <Icon path={Icons.printer} className="w-4 h-4" /> Imprimir Reporte
                                        </Button>
                                        <Button 
                                            onClick={cargarRegistros} 
                                            variant="ghost" 
                                            disabled={loading}
                                            className="flex items-center justify-center gap-2"
                                        >
                                            <Icon path={Icons.refresh} className="w-4 h-4" /> Actualizar
                                        </Button>
                                    </div>
                                </div>

                                {/* Totales */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
                                        <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Gastos</div>
                                        <div className="text-2xl font-black text-rose-700">{fmt(totalGastos)}</div>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                                        <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">Compras</div>
                                        <div className="text-2xl font-black text-purple-700">{fmt(totalCompras)}</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-xl p-4 text-center">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total del Día</div>
                                        <div className="text-2xl font-black text-white">{fmt(totalGeneral)}</div>
                                    </div>
                                </div>

                                {/* Tabla */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Hora</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Caja</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Descripción</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Tipo</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Categoría</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-600">Monto</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-600 no-print">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {registros.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                                                            <Icon path={Icons.alertCircle} className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                            <p>No hay registros para esta fecha</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    registros.map(reg => (
                                                        <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                                {reg.timestamp?.toDate?.().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'}) || '--:--'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm font-medium text-slate-700">{reg.caja}</td>
                                                            <td className="px-4 py-3 text-sm text-slate-800">{reg.descripcion}</td>
                                                            <td className="px-4 py-3">
                                                                <Badge variant={reg.tipo === 'Gasto' ? 'danger' : 'purple'}>
                                                                    {reg.tipo}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-600">{reg.categoria || '-'}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(reg.monto)}</td>
                                                            <td className="px-4 py-3 text-center no-print">
                                                                <button 
                                                                    onClick={() => handleEliminar(reg.id, reg.tipo)} 
                                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    disabled={loading}
                                                                >
                                                                    <Icon path={Icons.trash} className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-4 font-bold text-slate-800 uppercase text-sm">Total del Día</td>
                                                    <td className="px-4 py-4 text-right font-black text-xl text-slate-900">{fmt(totalGeneral)}</td>
                                                    <td className="no-print"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </FadeIn>
                )}
            </div>
        </div>
    );
}