// src/components/DataEntry.jsx

import React, { useState, useMemo } from 'react'; 
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import { GASTOS_CSV_COLUMNS, fmt } from '../constants'; 
import { EditableList } from './EditableList';

// --- Componentes Reutilizables ---
const Card = ({ title, children, className = '' }) => (
    <div className={`rounded-2xl shadow-sm border border-neutral-200 bg-white p-4 ${className}`}>
        <div className="text-lg font-semibold text-neutral-700 mb-3">{title}</div>
        {children}
    </div>
);

const NumberInput = ({ value, onChange, placeholder = '0.00', step = '0.01' }) => (
    <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        placeholder={placeholder}
        required 
    />
);

const TextInput = ({ value, onChange, placeholder = '' }) => (
    <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        placeholder={placeholder}
        required
    />
);

const getCurrentMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// -------------------------------------------------------------------------
// --- 1. Formulario de Ingresos ---
// -------------------------------------------------------------------------
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
            console.error('Error al registrar ingreso: ', error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium block">Fecha</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Monto ({fmt(0, 'C$').split(' ')[0]})</label>
                <NumberInput value={amount} onChange={setAmount} placeholder="5000.00" />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Sucursal</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                    <option value="" disabled>Seleccione una sucursal</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <button type="submit" disabled={loading || !branch} className={`w-full rounded-lg text-white px-3 py-2 font-medium transition ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                {loading ? 'Guardando...' : 'Registrar Ingreso'}
            </button>
        </form>
    );
};

// -------------------------------------------------------------------------
// --- 2. Formulario de Gastos ---
// -------------------------------------------------------------------------
const ExpenseForm = ({ categories, branches, loading, setLoading }) => {
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(categories?.[0]?.id || '');
    const [branch, setBranch] = useState(branches?.[0]?.id || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;

        if (!description || isNaN(numAmount) || numAmount <= 0 || !selectedCategoryName || !branch) {
              return alert('Datos inválidos.');
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
        } catch (error) {
            console.error('Error al registrar gasto: ', error);
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

                const validData = data.filter(row => {
                    return row['Monto'] && !isNaN(parseFloat(row['Monto']));
                }).map(row => ({
                    date: row['Fecha'] || new Date().toISOString().substring(0, 10),
                    description: row['Descripcion'] || 'Sin Descripción',
                    amount: parseFloat(row['Monto']),
                    category: row['Categoria'] || 'Otros',
                    branch: branches.find(b => b.id === row['Sucursal'] || b.name === row['Sucursal'])?.id || branches[0].id,
                    timestamp: Timestamp.now(),
                    is_conciled: false
                }));

                setLoading(true);
                try {
                    for (const item of validData) {
                        await addDoc(collection(db, 'gastos'), item);
                    }
                    alert(`Éxito al subir ${validData.length} gastos.`);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                    e.target.value = null; 
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Fecha</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Descripción</label>
                    <TextInput value={description} onChange={setDescription} placeholder="Pago de servicios..." />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Monto ({fmt(0, 'C$').split(' ')[0]})</label>
                    <NumberInput value={amount} onChange={setAmount} placeholder="150.00" />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Categoría</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                         <option value="" disabled>Seleccione...</option>
                         {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Sucursal</label>
                    <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                         {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <button type="submit" disabled={loading} className={`w-full rounded-lg text-white px-3 py-2 font-medium transition ${loading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}>
                    {loading ? 'Guardando...' : 'Registrar Gasto'}
                </button>
            </form>
            <Card title="Carga Masiva (CSV)" className="border-dashed border-2 border-neutral-300">
                <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={loading} className="text-sm" />
            </Card>
        </div>
    );
};

// -------------------------------------------------------------------------
// --- 3. Formulario de Inventario ---
// -------------------------------------------------------------------------
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
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium block">Mes</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Tipo</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
                    <option value="inicial">Inventario Inicial</option> 
                    <option value="final">Inventario Final</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Monto</label>
                <NumberInput value={amount} onChange={setAmount} />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Sucursal</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
                     {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg text-white px-3 py-2 font-medium bg-blue-600 hover:bg-blue-700">
                {loading ? 'Guardando...' : 'Registrar Inventario'}
            </button>
        </form>
    );
};

// -------------------------------------------------------------------------
// --- 4. Formulario de Compras ---
// -------------------------------------------------------------------------
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
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium block">Mes</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Total Compras</label>
                <NumberInput value={amount} onChange={setAmount} />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg text-white px-3 py-2 font-medium bg-purple-600 hover:bg-purple-700">
                {loading ? 'Guardando...' : 'Registrar Compras'}
            </button>
        </form>
    );
};

// -------------------------------------------------------------------------
// --- 5. NUEVO: Formulario de Presupuestos ---
// -------------------------------------------------------------------------
const BudgetForm = ({ categories, loading, setLoading }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(categories?.[0]?.id || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;

        if (isNaN(numAmount) || numAmount <= 0 || !selectedCategoryName) {
            return alert('Datos inválidos.');
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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium block">Mes del Presupuesto</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Categoría</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Monto Objetivo</label>
                <NumberInput value={amount} onChange={setAmount} placeholder="5000.00" />
            </div>
            <button type="submit" disabled={loading || !categoryId} className="w-full rounded-lg text-white px-3 py-2 font-medium bg-orange-600 hover:bg-orange-700">
                {loading ? 'Guardando...' : 'Establecer Presupuesto'}
            </button>
        </form>
    );
};

// -------------------------------------------------------------------------
// --- COMPONENTE PRINCIPAL ---
// -------------------------------------------------------------------------
export function DataEntry({ categories, branches, data, onDataChange }) {
    const [activeTab, setActiveTab] = useState('Ingresos');
    const [loading, setLoading] = useState(false);
    const [filterMonth, setFilterMonth] = useState({
        Ingresos: getCurrentMonth(),
        Gastos: getCurrentMonth(),
        Inventario: getCurrentMonth(),
        Compras: getCurrentMonth(),
        Presupuesto: getCurrentMonth(),
    });

    const tabs = ['Ingresos', 'Gastos', 'Inventario', 'Compras', 'Presupuesto'];

    const forms = {
        Ingresos: <IncomeForm branches={branches} loading={loading} setLoading={setLoading} />,
        Gastos: <ExpenseForm categories={categories} branches={branches} loading={loading} setLoading={setLoading} />,
        Inventario: <InventoryForm branches={branches} loading={loading} setLoading={setLoading} />,
        Compras: <PurchasesForm loading={loading} setLoading={setLoading} />,
        Presupuesto: <BudgetForm categories={categories} loading={loading} setLoading={setLoading} />,
    };

    const fields = {
        Ingresos: { date: { label: 'Fecha', type: 'date' }, amount: { label: 'Monto', type: 'currency' }, branch: { label: 'Sucursal', type: 'text' } },
        Gastos: { date: { label: 'Fecha', type: 'date' }, description: { label: 'Descripción', type: 'text' }, category: { label: 'Categoría', type: 'text' }, amount: { label: 'Monto', type: 'currency' }, branch: { label: 'Sucursal', type: 'text' } },
        Inventario: { month: { label: 'Mes', type: 'text' }, type: { label: 'Tipo', type: 'text' }, branch: { label: 'Sucursal', type: 'text' }, amount: { label: 'Monto', type: 'currency' } },
        Compras: { month: { label: 'Mes', type: 'text' }, amount: { label: 'Total', type: 'currency' } },
        Presupuesto: { month: { label: 'Mes', type: 'text' }, category: { label: 'Categoría', type: 'text' }, amount: { label: 'Presupuesto', type: 'currency' } },
    };

    const handleFilterChange = (tab, value) => {
        setFilterMonth(prev => ({ ...prev, [tab]: value }));
    };

    // 🚨 LÓGICA DE FILTRADO Y ORDENAMIENTO (EL MÁS RECIENTE PRIMERO)
    const filteredListData = useMemo(() => {
        let finalCol = activeTab.toLowerCase();
        if (finalCol === 'inventario') finalCol = 'inventarios';
        if (finalCol === 'presupuesto') finalCol = 'presupuestos';

        const records = [...(data[finalCol] || [])];
        const filterValue = filterMonth[activeTab];
        const filterKey = (activeTab === 'Inventario' || activeTab === 'Compras' || activeTab === 'Presupuesto') ? 'month' : 'date';

        // 1. Filtrar
        const filtered = records.filter(item => {
            if (!filterValue) return true;
            return item[filterKey]?.substring(0, 7) === filterValue;
        });

        // 2. Ordenar Descendente (Recientes arriba)
        return filtered.sort((a, b) => {
            const valA = a[filterKey] || "";
            const valB = b[filterKey] || "";
            if (valA !== valB) return valB.localeCompare(valA);
            
            // Desempate por timestamp exacto
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });

    }, [data, activeTab, filterMonth]);

    return (
        <Card title="Módulo de Registro de Datos">
            <div className="flex border-b mb-4 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-4 text-sm font-medium transition whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card title={`Registrar ${activeTab}`} className="h-full border-2 border-dashed border-emerald-300 bg-emerald-50/50">
                        {forms[activeTab]}
                    </Card>
                </div>
                
                <div className="lg:col-span-2">
                    <EditableList 
                        title={`Registros de ${activeTab} (Recientes primero)`}
                        data={filteredListData} 
                        collectionName={activeTab === 'Inventario' ? 'inventarios' : activeTab === 'Presupuesto' ? 'presupuestos' : activeTab.toLowerCase()}
                        fields={fields[activeTab]}
                        showMonthFilter={true} 
                        filterMonth={filterMonth[activeTab]}
                        onFilterChange={(value) => handleFilterChange(activeTab, value)}
                    />
                </div>
            </div>
        </Card>
    );
}