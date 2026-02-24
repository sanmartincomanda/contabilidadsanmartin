// src/components/DataEntry.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import { fmt } from '../constants';
import { EditableList } from './EditableList';

// --- ICONOS SVG INLINE (Mismo sistema que AccountsPayable) ---
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
    trendingUp: "M13 7h8m0 0v8m0-8l-8-8-4 4-6-6",
    trendingDown: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    arrowRightCircle: "M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z",
    calculator: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    wallet: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    shoppingCart: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    target: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    handCoin: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    scale: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    checkSquare: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    square: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
};

const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

// --- COMPONENTES UI REUTILIZABLES ---

const FadeIn = ({ children, delay = 0, className = "" }) => (
    <div 
        className={`animate-fade-in ${className}`}
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
        {children}
    </div>
);

const Card = ({ title, children, className = "", right, icon, gradient = false }) => (
    <div className={`rounded-2xl shadow-lg border border-slate-200/60 bg-white/80 backdrop-blur-xl overflow-hidden ${className}`}>
        <div className={`flex justify-between items-center px-6 py-4 border-b border-slate-100 ${gradient ? 'bg-gradient-to-r from-emerald-50 to-teal-50' : 'bg-gradient-to-r from-slate-50/50 to-white'}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className={`p-2 rounded-lg ${gradient ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                        <Icon path={Icons[icon]} className={`w-5 h-5 ${gradient ? 'text-emerald-600' : 'text-blue-600'}`} />
                    </div>
                )}
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
            {right}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const Button = ({ children, variant = 'primary', className = '', disabled, size = 'md', ...props }) => {
    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3',
        lg: 'px-8 py-4 text-lg'
    };
    
    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30',
        success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30',
        purple: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30',
        orange: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30',
        sky: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-lg shadow-sky-500/30',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-slate-200',
        outline: 'bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600'
    };
    
    return (
        <button 
            disabled={disabled}
            className={`${sizes[size]} rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Input = ({ label, icon, type = "text", className = '', ...props }) => (
    <div className="space-y-2">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
        <div className="relative group">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
            <input 
                type={type}
                className={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 ${icon ? 'pl-11' : ''} ${className}`}
                {...props}
            />
        </div>
    </div>
);

const Select = ({ label, icon, options = [], ...props }) => (
    <div className="space-y-2">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
        <div className="relative">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
            <select 
                className={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 appearance-none cursor-pointer ${icon ? 'pl-11' : ''}`}
                {...props}
            >
                {options}
            </select>
            <Icon path={Icons.chevronRight} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
        </div>
    </div>
);

// --- HELPERS ---
const getCurrentMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// --- FORMULARIOS INDIVIDUALES ---

const IncomeForm = ({ branches, loading, setLoading }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [amount, setAmount] = useState('');
    const [branch, setBranch] = useState(branches?.[0]?.id || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) return alert('Monto inválido.');
        if (!branch) return alert('Debes seleccionar una sucursal.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'ingresos'), {
                date,
                amount: numAmount,
                branch,
                timestamp: Timestamp.now(),
                is_conciled: false,
            });
            setAmount('');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input
                label="Fecha"
                type="date"
                icon="calendar"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
            />
            <Input
                label="Monto"
                type="number"
                step="0.01"
                icon="dollar"
                placeholder="0.00"
                className="text-xl font-black text-emerald-600"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
            />
            <Select
                label="Sucursal"
                icon="building"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                required
                options={
                    <>
                        <option value="">Seleccionar sucursal...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </>
                }
            />
            <Button type="submit" variant="success" disabled={loading || !branch} className="w-full">
                {loading ? 'Guardando...' : 'Registrar Ingreso'}
            </Button>
        </form>
    );
};

const ExpenseForm = ({ categories, branches, loading, setLoading }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [branch, setBranch] = useState(branches?.[0]?.id || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;

        if (!description || isNaN(numAmount) || numAmount <= 0 || !selectedCategoryName || !branch) {
            return alert('Complete todos los campos correctamente.');
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'gastos'), {
                date,
                description,
                amount: numAmount,
                category: selectedCategoryName,
                branch,
                timestamp: Timestamp.now(),
                is_conciled: false,
            });
            setDescription('');
            setAmount('');
            setCategoryId('');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };
    
    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async ({ data, errors }) => {
                if (errors.length) return alert("Error en formato CSV.");

                const validData = data.filter(row => row['Monto'] && !isNaN(parseFloat(row['Monto']))).map(row => ({
                    date: row['Fecha'] || new Date().toISOString().substring(0, 10),
                    description: row['Descripcion'] || 'Sin Descripción',
                    amount: parseFloat(row['Monto']),
                    category: row['Categoria'] || 'Otros',
                    branch: branches.find(b => b.id === row['Sucursal'] || b.name === row['Sucursal'])?.id || branches[0]?.id,
                    timestamp: Timestamp.now(),
                    is_conciled: false
                }));

                setLoading(true);
                try {
                    for (const item of validData) {
                        await addDoc(collection(db, 'gastos'), item);
                    }
                    alert(`Éxito: ${validData.length} gastos importados.`);
                } catch (error) {
                    console.error(error);
                    alert('Error al importar');
                } finally {
                    setLoading(false);
                    e.target.value = null;
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                    label="Fecha"
                    type="date"
                    icon="calendar"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                />
                <Input
                    label="Descripción"
                    icon="fileText"
                    placeholder="Ej: Pago de servicios, Compra de insumos..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Monto"
                        type="number"
                        step="0.01"
                        icon="dollar"
                        placeholder="0.00"
                        className="text-lg font-black text-red-600"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                    />
                    <Select
                        label="Categoría"
                        icon="receipt"
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        required
                        options={
                            <>
                                <option value="">Seleccionar...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </>
                        }
                    />
                </div>
                <Select
                    label="Sucursal"
                    icon="building"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    required
                    options={branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                />
                <Button type="submit" variant="danger" disabled={loading} className="w-full">
                    {loading ? 'Guardando...' : 'Registrar Gasto'}
                </Button>
            </form>
            
            <div className="border-t border-slate-200 pt-6">
                <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center">
                    <Icon path={Icons.upload} className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-700 mb-2">Carga Masiva CSV</h4>
                    <p className="text-xs text-slate-500 mb-4">Importa múltiples gastos desde archivo Excel/CSV</p>
                    <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleCSVUpload} 
                        disabled={loading}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};

const InventoryForm = ({ branches, loading, setLoading }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [type, setType] = useState('inicial');
    const [amount, setAmount] = useState('');
    const [branch, setBranch] = useState(branches?.[0]?.id || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 0) return alert('Monto inválido.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'inventarios'), {
                month, type, amount: numAmount, branch, timestamp: Timestamp.now(),
            });
            setAmount('');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input
                label="Mes"
                type="month"
                icon="calendar"
                value={month}
                onChange={e => setMonth(e.target.value)}
                required
            />
            <Select
                label="Tipo de Inventario"
                icon="box"
                value={type}
                onChange={e => setType(e.target.value)}
                options={
                    <>
                        <option value="inicial">Inventario Inicial</option>
                        <option value="final">Inventario Final</option>
                    </>
                }
            />
            <Input
                label="Monto"
                type="number"
                step="0.01"
                icon="dollar"
                placeholder="0.00"
                className="text-xl font-black text-blue-600"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
            />
            <Select
                label="Sucursal"
                icon="building"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                options={branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            />
            <Button type="submit" variant="primary" disabled={loading} className="w-full">
                {loading ? 'Guardando...' : 'Registrar Inventario'}
            </Button>
        </form>
    );
};

const PurchasesForm = ({ loading, setLoading }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) return alert('Monto inválido.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'compras'), {
                month, amount: numAmount, timestamp: Timestamp.now(),
            });
            setAmount('');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input
                label="Mes"
                type="month"
                icon="calendar"
                value={month}
                onChange={e => setMonth(e.target.value)}
                required
            />
            <Input
                label="Total Compras del Mes"
                type="number"
                step="0.01"
                icon="shoppingCart"
                placeholder="0.00"
                className="text-2xl font-black text-purple-600"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
            />
            <Button type="submit" variant="purple" disabled={loading} className="w-full">
                {loading ? 'Guardando...' : 'Registrar Compras'}
            </Button>
        </form>
    );
};

const BudgetForm = ({ categories, loading, setLoading }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;

        if (isNaN(numAmount) || numAmount <= 0 || !selectedCategoryName) {
            return alert('Complete todos los campos.');
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'presupuestos'), {
                month,
                category: selectedCategoryName,
                amount: numAmount,
                timestamp: Timestamp.now(),
            });
            setAmount('');
            setCategoryId('');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input
                label="Mes del Presupuesto"
                type="month"
                icon="calendar"
                value={month}
                onChange={e => setMonth(e.target.value)}
                required
            />
            <Select
                label="Categoría"
                icon="target"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                required
                options={
                    <>
                        <option value="">Seleccionar categoría...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </>
                }
            />
            <Input
                label="Monto Objetivo"
                type="number"
                step="0.01"
                icon="dollar"
                placeholder="0.00"
                className="text-xl font-black text-orange-600"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
            />
            <Button type="submit" variant="orange" disabled={loading || !categoryId} className="w-full">
                {loading ? 'Guardando...' : 'Establecer Presupuesto'}
            </Button>
        </form>
    );
};

const ReceivableForm = ({ loading, setLoading }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!description || isNaN(numAmount) || numAmount <= 0) return alert('Datos inválidos.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'cuentasPorCobrar'), {
                date, description, amount: numAmount, timestamp: Timestamp.now(),
            });
            setDescription('');
            setAmount('');
        } catch (error) { 
            console.error(error);
            alert('Error al guardar');
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input
                label="Fecha"
                type="date"
                icon="calendar"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
            />
            <Input
                label="Cliente / Concepto"
                icon="users"
                placeholder="Nombre del deudor o concepto..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
            />
            <Input
                label="Monto a Cobrar"
                type="number"
                step="0.01"
                icon="handCoin"
                placeholder="0.00"
                className="text-xl font-black text-sky-600"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
            />
            <Button type="submit" variant="sky" disabled={loading} className="w-full">
                {loading ? 'Guardando...' : 'Registrar Cuenta por Cobrar'}
            </Button>
        </form>
    );
};

const EquityForm = ({ loading, setLoading }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!description || isNaN(numAmount)) return alert('Datos inválidos.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'patrimonio'), {
                date, description, amount: numAmount, timestamp: Timestamp.now(),
            });
            setDescription('');
            setAmount('');
        } catch (error) { 
            console.error(error);
            alert('Error al guardar');
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input
                label="Fecha"
                type="date"
                icon="calendar"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
            />
            <Input
                label="Descripción"
                icon="scale"
                placeholder="Capital inicial, Aporte de socio, Reservas..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
            />
            <Input
                label="Monto"
                type="number"
                step="0.01"
                icon="dollar"
                placeholder="0.00"
                className="text-xl font-black text-emerald-600"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
            />
            <Button type="submit" variant="success" disabled={loading} className="w-full">
                {loading ? 'Guardando...' : 'Registrar Patrimonio'}
            </Button>
        </form>
    );
};

// --- COMPONENTE PRINCIPAL ---

export function DataEntry({ categories, branches, data, onDataChange }) {
    const [activeTab, setActiveTab] = useState('Ingresos');
    const [loading, setLoading] = useState(false);
    const [filterMonth, setFilterMonth] = useState({
        Ingresos: getCurrentMonth(),
        Gastos: getCurrentMonth(),
        Inventario: getCurrentMonth(),
        Compras: getCurrentMonth(),
        Presupuesto: getCurrentMonth(),
        "Cuentas por Cobrar": getCurrentMonth(),
        Patrimonio: getCurrentMonth(),
    });

    // Configuración de tabs con iconos y colores
    const tabsConfig = {
        Ingresos: { icon: 'trendingUp', color: 'emerald', component: IncomeForm },
        Gastos: { icon: 'trendingDown', color: 'red', component: ExpenseForm },
        Inventario: { icon: 'box', color: 'blue', component: InventoryForm },
        Compras: { icon: 'shoppingCart', color: 'purple', component: PurchasesForm },
        Presupuesto: { icon: 'target', color: 'orange', component: BudgetForm },
        "Cuentas por Cobrar": { icon: 'handCoin', color: 'sky', component: ReceivableForm },
        Patrimonio: { icon: 'scale', color: 'emerald', component: EquityForm }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Reset loading state al cambiar de tab
        setLoading(false);
    };

    const handleFilterChange = (tab, value) => {
        setFilterMonth(prev => ({ ...prev, [tab]: value }));
    };

    const filteredListData = useMemo(() => {
        let finalCol = activeTab === 'Cuentas por Cobrar' ? 'cuentasPorCobrar' : activeTab.toLowerCase();
        if (finalCol === 'inventario') finalCol = 'inventarios';
        if (finalCol === 'presupuesto') finalCol = 'presupuestos';

        const records = [...(data[finalCol] || [])];
        const filterValue = filterMonth[activeTab];
        const filterKey = (activeTab === 'Inventario' || activeTab === 'Compras' || activeTab === 'Presupuesto') ? 'month' : 'date';

        const filtered = records.filter(item => {
            if (!filterValue) return true;
            return item[filterKey]?.substring(0, 7) === filterValue;
        });

        return filtered.sort((a, b) => {
            const valA = a[filterKey] || "";
            const valB = b[filterKey] || "";
            if (valA !== valB) return valB.localeCompare(valA);
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
    }, [data, activeTab, filterMonth]);

    const ActiveComponent = tabsConfig[activeTab].component;
    const isInventory = activeTab === 'Inventario';
    const isPurchases = activeTab === 'Compras';
    const isBudget = activeTab === 'Presupuesto';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 p-4 md:p-8">
            {/* CSS Animaciones */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slide-in-right {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slide-in-left {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out; }
                .animate-slide-right { animation: slide-in-right 0.4s ease-out; }
                .animate-slide-left { animation: slide-in-left 0.4s ease-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
            `}</style>

            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <FadeIn className="mb-8">
                    <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                        Registro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Datos</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Ingresa ingresos, gastos, inventarios y más</p>
                </FadeIn>

                {/* NAVEGACIÓN TABS - DISEÑO CORREGIDO */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(tabsConfig).map(([tab, config]) => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                                    activeTab === tab 
                                        ? `bg-${config.color}-600 text-white shadow-lg shadow-${config.color}-500/30` 
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                                style={{
                                    backgroundColor: activeTab === tab ? 
                                        (config.color === 'emerald' ? '#059669' : 
                                         config.color === 'red' ? '#dc2626' :
                                         config.color === 'blue' ? '#2563eb' :
                                         config.color === 'purple' ? '#9333ea' :
                                         config.color === 'orange' ? '#ea580c' :
                                         config.color === 'sky' ? '#0284c7' : '#059669') 
                                        : undefined
                                }}
                            >
                                <Icon path={Icons[config.icon]} className="w-4 h-4" />
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* FORMULARIO */}
                    <div className="lg:col-span-1 animate-slide-left">
                        <Card 
                            title={`Nuevo ${activeTab}`} 
                            icon={tabsConfig[activeTab].icon}
                            gradient={true}
                        >
                            <ActiveComponent 
                                categories={categories} 
                                branches={branches} 
                                loading={loading} 
                                setLoading={setLoading} 
                            />
                        </Card>
                    </div>

                    {/* LISTA DE REGISTROS */}
                    <div className="lg:col-span-2 animate-slide-right">
                        <Card 
                            title={`Historial de ${activeTab}`} 
                            icon="receipt"
                            right={
                                <div className="flex items-center gap-2">
                                    <input
                                        type="month"
                                        value={filterMonth[activeTab]}
                                        onChange={(e) => handleFilterChange(activeTab, e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                                    />
                                </div>
                            }
                        >
                            <EditableList 
                                data={filteredListData} 
                                collectionName={
                                    activeTab === 'Inventario' ? 'inventarios' : 
                                    activeTab === 'Presupuesto' ? 'presupuestos' : 
                                    activeTab === 'Cuentas por Cobrar' ? 'cuentasPorCobrar' : 
                                    activeTab.toLowerCase()
                                }
                                fields={{
                                    Ingresos: { date: { label: 'Fecha', type: 'date' }, amount: { label: 'Monto', type: 'currency' }, branch: { label: 'Sucursal', type: 'text' } },
                                    Gastos: { date: { label: 'Fecha', type: 'date' }, description: { label: 'Descripción', type: 'text' }, category: { label: 'Categoría', type: 'text' }, amount: { label: 'Monto', type: 'currency' }, branch: { label: 'Sucursal', type: 'text' } },
                                    Inventario: { month: { label: 'Mes', type: 'text' }, type: { label: 'Tipo', type: 'text' }, branch: { label: 'Sucursal', type: 'text' }, amount: { label: 'Monto', type: 'currency' } },
                                    Compras: { month: { label: 'Mes', type: 'text' }, amount: { label: 'Total', type: 'currency' } },
                                    Presupuesto: { month: { label: 'Mes', type: 'text' }, category: { label: 'Categoría', type: 'text' }, amount: { label: 'Presupuesto', type: 'currency' } },
                                    "Cuentas por Cobrar": { date: { label: 'Fecha', type: 'date' }, description: { label: 'Concepto', type: 'text' }, amount: { label: 'Monto', type: 'currency' } },
                                    Patrimonio: { date: { label: 'Fecha', type: 'date' }, description: { label: 'Descripción', type: 'text' }, amount: { label: 'Monto', type: 'currency' } },
                                }[activeTab]}
                                showMonthFilter={false}
                            />
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}