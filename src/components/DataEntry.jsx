// src/components/DataEntry.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, Timestamp, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc 
} from 'firebase/firestore';
import Papa from 'papaparse';
import { fmt } from '../constants';

// --- ICONOS SVG INLINE ---
const Icons = {
    plus: "M12 4v16m8-8H4",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    save: "M5 13l4 4L19 7",
    x: "M6 18L18 6M6 6l12 12",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    fileText: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    alertCircle: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    checkCircle: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    chevronRight: "M9 5l7 7-7 7",
    trendingDown: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
    trendingUp: "M13 7h8m0 0v8m0-8l-8-8-4 4-6-6",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    cash: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    printer: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
    filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12",
    box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    shoppingCart: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    target: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    handCoin: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    scale: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
    refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
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

// --- COMPONENTE: EDITABLE LIST (INTEGRADO) ---

const EditableRow = ({ item, collectionName, fields, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(item);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const dataToSave = {};
            for (const key in editData) {
                if (key === 'id') continue;
                if (fields[key]?.type === 'number' || fields[key]?.type === 'currency') {
                    dataToSave[key] = parseFloat(editData[key]) || 0;
                } else if (key === 'timestamp') {
                    continue;
                } else {
                    dataToSave[key] = editData[key];
                }
            }
            
            await updateDoc(doc(db, collectionName, item.id), dataToSave);
            setIsEditing(false);
            onUpdate(item.id, dataToSave);
        } catch (error) {
            console.error("Error al actualizar:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("¿Eliminar este registro?")) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, collectionName, item.id));
            onDelete(item.id);
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error al eliminar: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const renderValue = (key, value) => {
        const field = fields[key];
        if (value === null || value === undefined) return '—';
        if (typeof value === 'object' && value instanceof Timestamp) {
            try { return value.toDate().toLocaleString('es-ES'); } catch (e) { return '—'; }
        }
        if (field?.type === 'currency') return fmt(Number(value));
        return String(value);
    };

    const renderInput = (key, value) => {
        const field = fields[key];
        const type = field?.type === 'currency' || field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : field?.type === 'month' ? 'month' : 'text';
        
        if (key === 'timestamp') return <span className='text-slate-400 text-xs'>No editable</span>;

        return (
            <input
                type={type}
                step={type === 'number' ? '0.01' : undefined}
                value={value === null || value === undefined ? '' : String(value)}
                onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                className="w-full rounded border border-blue-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
            />
        );
    };

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            {Object.keys(fields).map(key => (
                <td key={key} className="py-3 px-3 text-sm">
                    {isEditing ? renderInput(key, editData[key]) : renderValue(key, item[key])}
                </td>
            ))}
            <td className="py-3 px-3 whitespace-nowrap">
                {isEditing ? (
                    <div className='flex gap-1'>
                        <Button onClick={handleSave} disabled={loading || !item.id} variant="success" size="sm" className="flex items-center gap-1">
                            <Icon path={Icons.save} className="w-3 h-3" /> Guardar
                        </Button>
                        <Button onClick={() => setIsEditing(false)} disabled={loading} variant="ghost" size="sm">Cancelar</Button>
                    </div>
                ) : (
                    <div className='flex gap-1'>
                        <Button onClick={() => setIsEditing(true)} disabled={!item.id} variant="warning" size="sm" className="flex items-center gap-1">
                            <Icon path={Icons.edit} className="w-3 h-3" /> Editar
                        </Button>
                        <Button onClick={handleDelete} disabled={loading || !item.id} variant="danger" size="sm" className="flex items-center gap-1">
                            <Icon path={Icons.trash} className="w-3 h-3" /> Eliminar
                        </Button>
                    </div>
                )}
            </td>
        </tr>
    );
};

const EditableList = ({ data, collectionName, fields, filterMonth, onFilterChange }) => {
    const [localData, setLocalData] = useState(data);

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    const handleUpdate = (id, newData) => {
        setLocalData(prev => prev.map(item => item.id === id ? { ...item, ...newData } : item));
    };

    const handleDelete = (id) => {
        setLocalData(prev => prev.filter(item => item.id !== id));
    };

    const getItemDate = (item) => {
        const dateStr = item.date || item.fecha || item.month || item.mes;
        if (!dateStr) return new Date(0);
        return new Date(dateStr);
    };

    const filteredData = useMemo(() => {
        let result = localData;
        
        if (filterMonth) {
            result = localData.filter(item => {
                const itemDate = item.date || item.month || item.fecha || item.mes;
                return itemDate && itemDate.substring(0, 7) === filterMonth;
            });
        }
        
        return result.sort((a, b) => {
            const dateA = getItemDate(a);
            const dateB = getItemDate(b);
            return dateB - dateA;
        });
    }, [localData, filterMonth]);

    const hasData = filteredData && filteredData.length > 0;

    return (
        <div className="mt-6">
            {onFilterChange && (
                <div className="mb-4 flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-600 uppercase">Filtrar por Mes:</label>
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                </div>
            )}
            
            {!hasData ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-center">
                    <Icon path={Icons.alertCircle} className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">
                        {filterMonth ? `No hay registros para ${filterMonth}` : "No hay registros recientes"}
                    </p>
                    <p className="text-sm mt-1">¡Empieza a registrar datos!</p>
                </div>
            ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left bg-slate-100 border-b border-slate-200">
                                {Object.values(fields).map(field => (
                                    <th key={field.label} className="py-3 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">{field.label}</th>
                                ))}
                                <th className="py-3 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <EditableRow 
                                    key={item.id} 
                                    item={item} 
                                    collectionName={collectionName} 
                                    fields={fields}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- FORMULARIOS ---

const IncomeForm = ({ branches, loading, setLoading, onSuccess }) => {
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
                date, amount: numAmount, branch, timestamp: Timestamp.now(), is_conciled: false,
            });
            setAmount('');
            onSuccess?.();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-emerald-600" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Select label="Sucursal" icon="building" value={branch} onChange={e => setBranch(e.target.value)} required options={<><option value="">Seleccionar...</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</>} />
            <Button type="submit" variant="success" disabled={loading || !branch} className="w-full">{loading ? 'Guardando...' : 'Registrar Ingreso'}</Button>
        </form>
    );
};

const ExpenseForm = ({ categories, branches, loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [branch, setBranch] = useState(branches?.[0]?.id || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;
        if (!description || isNaN(numAmount) || numAmount <= 0 || !selectedCategoryName || !branch) return alert('Complete todos los campos.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'gastos'), {
                date, description, amount: numAmount, category: selectedCategoryName, branch, timestamp: Timestamp.now(), is_conciled: false,
            });
            setDescription(''); setAmount(''); setCategoryId('');
            onSuccess?.();
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
                if (errors.length) return alert("Error en CSV.");
                const validData = data.filter(row => row['Monto'] && !isNaN(parseFloat(row['Monto']))).map(row => ({
                    date: row['Fecha'] || new Date().toISOString().substring(0, 10),
                    description: row['Descripcion'] || 'Sin Descripción',
                    amount: parseFloat(row['Monto']),
                    category: row['Categoria'] || 'Otros',
                    branch: branches.find(b => b.id === row['Sucursal'] || b.name === row['Sucursal'])?.id || branches[0]?.id,
                    timestamp: Timestamp.now(), is_conciled: false
                }));
                setLoading(true);
                try {
                    for (const item of validData) await addDoc(collection(db, 'gastos'), item);
                    alert(`Éxito: ${validData.length} gastos importados.`);
                    onSuccess?.();
                } catch (error) {
                    alert('Error al importar');
                } finally {
                    setLoading(false); e.target.value = null;
                }
            }
        });
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
                <Input label="Descripción" icon="fileText" placeholder="Ej: Pago de servicios..." value={description} onChange={e => setDescription(e.target.value)} required />
                <div className="grid grid-cols-2 gap-3">
                    <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-rose-600" value={amount} onChange={e => setAmount(e.target.value)} required />
                    <Select label="Categoría" icon="tag" value={categoryId} onChange={e => setCategoryId(e.target.value)} required options={<><option value="">Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>} />
                </div>
                <Select label="Sucursal" icon="building" value={branch} onChange={e => setBranch(e.target.value)} required options={branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)} />
                <Button type="submit" variant="danger" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar Gasto'}</Button>
            </form>
            <div className="border-t border-slate-200 pt-4">
                <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-4 text-center">
                    <Icon path={Icons.upload} className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-700 text-sm mb-1">Carga Masiva CSV</h4>
                    <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={loading} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer" />
                </div>
            </div>
        </div>
    );
};

// --- OTROS FORMULARIOS ---

const InventoryForm = ({ branches, loading, setLoading, onSuccess }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [type, setType] = useState('inicial');
    const [amount, setAmount] = useState('');
    const [branch, setBranch] = useState(branches?.[0]?.id || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'inventarios'), { month, type, amount: Number(amount) || 0, branch, timestamp: Timestamp.now() });
            setAmount(''); onSuccess?.();
        } catch (error) { alert('Error'); }
        finally { setLoading(false); }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Mes" type="month" icon="calendar" value={month} onChange={e => setMonth(e.target.value)} required />
            <Select label="Tipo" icon="box" value={type} onChange={e => setType(e.target.value)} options={<><option value="inicial">Inicial</option><option value="final">Final</option></>} />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Select label="Sucursal" icon="building" value={branch} onChange={e => setBranch(e.target.value)} options={branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)} />
            <Button type="submit" variant="primary" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar'}</Button>
        </form>
    );
};

const PurchasesForm = ({ loading, setLoading, onSuccess }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'compras'), { month, amount: Number(amount) || 0, timestamp: Timestamp.now() });
            setAmount(''); onSuccess?.();
        } catch (error) { alert('Error'); }
        finally { setLoading(false); }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Mes" type="month" icon="calendar" value={month} onChange={e => setMonth(e.target.value)} required />
            <Input label="Total Compras" type="number" step="0.01" icon="shoppingCart" placeholder="0.00" className="text-lg font-bold text-purple-600" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="purple" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar Compras'}</Button>
        </form>
    );
};

const BudgetForm = ({ categories, loading, setLoading, onSuccess }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const catName = categories.find(c => c.id === categoryId)?.name;
            await addDoc(collection(db, 'presupuestos'), { month, category: catName, amount: Number(amount) || 0, timestamp: Timestamp.now() });
            setAmount(''); setCategoryId(''); onSuccess?.();
        } catch (error) { alert('Error'); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Mes" type="month" icon="calendar" value={month} onChange={e => setMonth(e.target.value)} required />
            <Select label="Categoría" icon="tag" value={categoryId} onChange={e => setCategoryId(e.target.value)} required options={<><option value="">Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>} />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="warning" disabled={loading || !categoryId} className="w-full">{loading ? 'Guardando...' : 'Establecer Presupuesto'}</Button>
        </form>
    );
};

const ReceivableForm = ({ loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'cuentasPorCobrar'), { date, description, amount: Number(amount) || 0, timestamp: Timestamp.now() });
            setDescription(''); setAmount(''); onSuccess?.();
        } catch (error) { alert('Error'); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
            <Input label="Cliente/Concepto" icon="users" placeholder="Nombre..." value={description} onChange={e => setDescription(e.target.value)} required />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-sky-600" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="sky" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar'}</Button>
        </form>
    );
};

const EquityForm = ({ loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'patrimonio'), { date, description, amount: Number(amount) || 0, timestamp: Timestamp.now() });
            setDescription(''); setAmount(''); onSuccess?.();
        } catch (error) { alert('Error'); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
            <Input label="Descripción" icon="scale" placeholder="Capital, aporte..." value={description} onChange={e => setDescription(e.target.value)} required />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-emerald-600" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="success" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar Patrimonio'}</Button>
        </form>
    );
};

const getCurrentMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// --- COMPONENTE PRINCIPAL ---

export function DataEntry({ categories, branches, data }) {
    const [activeTab, setActiveTab] = useState('Ingresos');
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const [filterMonth, setFilterMonth] = useState({
        Ingresos: getCurrentMonth(),
        Gastos: getCurrentMonth(),
        Inventario: getCurrentMonth(),
        Compras: getCurrentMonth(),
        Presupuesto: getCurrentMonth(),
        'Cuentas por Cobrar': getCurrentMonth(),
        Patrimonio: getCurrentMonth(),
    });

    const tabsConfig = {
        'Ingresos': { icon: 'trendingUp', label: 'Ingresos', color: 'emerald' },
        'Gastos': { icon: 'trendingDown', label: 'Gastos', color: 'rose' },
        'Inventario': { icon: 'box', label: 'Inventario', color: 'blue' },
        'Compras': { icon: 'shoppingCart', label: 'Compras', color: 'purple' },
        'Presupuesto': { icon: 'target', label: 'Presupuesto', color: 'amber' },
        'Cuentas por Cobrar': { icon: 'handCoin', label: 'Cuentas por Cobrar', color: 'sky' },
        'Patrimonio': { icon: 'scale', label: 'Patrimonio', color: 'emerald' }
    };

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleFilterChange = (tab, value) => {
        setFilterMonth(prev => ({ ...prev, [tab]: value }));
    };

    const fieldsConfig = {
        Ingresos: {
            date: { label: 'Fecha', type: 'date' },
            amount: { label: 'Monto', type: 'currency' },
            branch: { label: 'Sucursal', type: 'text' }
        },
        Gastos: {
            date: { label: 'Fecha', type: 'date' },
            description: { label: 'Descripción', type: 'text' },
            category: { label: 'Categoría', type: 'text' },
            amount: { label: 'Monto', type: 'currency' },
            branch: { label: 'Sucursal', type: 'text' }
        },
        Inventario: {
            month: { label: 'Mes', type: 'month' },
            type: { label: 'Tipo', type: 'text' },
            amount: { label: 'Monto', type: 'currency' },
            branch: { label: 'Sucursal', type: 'text' }
        },
        Compras: {
            month: { label: 'Mes', type: 'month' },
            amount: { label: 'Total', type: 'currency' }
        },
        Presupuesto: {
            month: { label: 'Mes', type: 'month' },
            category: { label: 'Categoría', type: 'text' },
            amount: { label: 'Presupuesto', type: 'currency' }
        },
        'Cuentas por Cobrar': {
            date: { label: 'Fecha', type: 'date' },
            description: { label: 'Concepto', type: 'text' },
            amount: { label: 'Monto', type: 'currency' }
        },
        Patrimonio: {
            date: { label: 'Fecha', type: 'date' },
            description: { label: 'Descripción', type: 'text' },
            amount: { label: 'Monto', type: 'currency' }
        }
    };

    const getListData = () => {
        const collectionMap = {
            'Ingresos': 'ingresos',
            'Gastos': 'gastos',
            'Inventario': 'inventarios',
            'Compras': 'compras',
            'Presupuesto': 'presupuestos',
            'Cuentas por Cobrar': 'cuentasPorCobrar',
            'Patrimonio': 'patrimonio'
        };
        return data[collectionMap[activeTab]] || [];
    };

    const getCollectionName = () => {
        const map = {
            'Ingresos': 'ingresos',
            'Gastos': 'gastos',
            'Inventario': 'inventarios',
            'Compras': 'compras',
            'Presupuesto': 'presupuestos',
            'Cuentas por Cobrar': 'cuentasPorCobrar',
            'Patrimonio': 'patrimonio'
        };
        return map[activeTab];
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out; }
                @media print { .no-print { display: none !important; } }
            `}</style>

            <div className="max-w-7xl mx-auto">
                <FadeIn className="mb-8">
                    <h1 className="text-4xl font-black text-slate-800 mb-2">Registro de <span className="text-blue-600">Datos</span></h1>
                    <p className="text-slate-500">Ingresa ingresos, gastos, inventarios y más</p>
                </FadeIn>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6 no-print">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(tabsConfig).map(([tab, config]) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                    activeTab === tab ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Icon path={Icons[config.icon]} className="w-4 h-4" />
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FadeIn className="no-print">
                        <Card title={`Nuevo ${tabsConfig[activeTab].label}`} icon={tabsConfig[activeTab].icon} gradient={true}>
                            {activeTab === 'Ingresos' && <IncomeForm branches={branches} loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                            {activeTab === 'Gastos' && <ExpenseForm categories={categories} branches={branches} loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                            {activeTab === 'Inventario' && <InventoryForm branches={branches} loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                            {activeTab === 'Compras' && <PurchasesForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                            {activeTab === 'Presupuesto' && <BudgetForm categories={categories} loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                            {activeTab === 'Cuentas por Cobrar' && <ReceivableForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                            {activeTab === 'Patrimonio' && <EquityForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        </Card>
                    </FadeIn>

                    <FadeIn delay={100}>
                        <Card title={`Historial de ${tabsConfig[activeTab].label}`} icon="receipt">
                            <EditableList 
                                data={getListData()}
                                collectionName={getCollectionName()}
                                fields={fieldsConfig[activeTab]}
                                filterMonth={filterMonth[activeTab]}
                                onFilterChange={(value) => handleFilterChange(activeTab, value)}
                            />
                        </Card>
                    </FadeIn>
                </div>
            </div>
        </div>
    );
}