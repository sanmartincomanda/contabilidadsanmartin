// src/components/DataEntry.jsx

import React, { useState, useMemo } from 'react'; // AÑADIDO: useMemo
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
// Importamos solo lo que se usa. BRANCHES, fmt y GASTOS_CSV_COLUMNS deben estar en '../constants'.
import { GASTOS_CSV_COLUMNS, fmt } from '../constants'; 
import { EditableList } from './EditableList'

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

// --- FUNCIÓN ÚTIL PARA EL FILTRO ---
const getCurrentMonth = () => {
    const date = new Date();
    // Formato YYYY-MM para el input type="month"
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
// -------------------------------------------------------------------------
// --- 1. Componente de Ingresos ---
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
            setDate(new Date().toISOString().substring(0, 10));
            setAmount('');
        } catch (error) {
            console.error('Error al registrar ingreso: ', error);
            alert('Error al registrar ingreso.');
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
                <NumberInput value={amount} onChange={setAmount} placeholder="5000.00" required />
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
// --- 2. Componente de Gastos ---
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
              return alert('Datos inválidos, monto, sucursal o categoría no seleccionada.');
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
            alert('Error al registrar gasto.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleCSVUpload = (e) => {
        // Lógica de carga masiva CSV
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async ({ data, errors }) => {
                if (errors.length) { console.error("Errores CSV:", errors); return alert("Hay errores en el formato CSV."); }

                const validData = data.filter(row => {
                    return row['Monto'] && !isNaN(parseFloat(row['Monto'])) && branches.some(b => b.id === row['Sucursal'] || b.name === row['Sucursal']);
                }).map(row => ({
                    date: row['Fecha'] || new Date().toISOString().substring(0, 10),
                    description: row['Descripcion'] || 'Sin Descripción',
                    amount: parseFloat(row['Monto']),
                    category: row['Categoria'] || 'Otros',
                    branch: branches.find(b => b.id === row['Sucursal'] || b.name === row['Sucursal'])?.id || branches[0].id,
                    timestamp: Timestamp.now(),
                }));

                if (validData.length === 0) return alert("No se encontraron registros válidos para subir.");

                setLoading(true);
                let uploadCount = 0;
                try {
                    for (const item of validData) {
                        await addDoc(collection(db, 'gastos'), item);
                        uploadCount++;
                    }
                    alert(`Éxito al subir ${uploadCount} gastos.`);
                } catch (error) {
                    console.error('Error en carga masiva:', error);
                    alert(`Fallo la carga después de ${uploadCount} registros.`);
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
                    <TextInput value={description} onChange={setDescription} placeholder="Ej: Pago de Luz Oficina Principal" required />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Monto ({fmt(0, 'C$').split(' ')[0]})</label>
                    <NumberInput value={amount} onChange={setAmount} placeholder="150.00" required />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Categoría</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                         <option value="" disabled>Seleccione una categoría</option>
                         {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium block">Sucursal</label>
                    <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                         <option value="" disabled>Seleccione una sucursal</option>
                         {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <button type="submit" disabled={loading || !categoryId || !branch} className={`w-full rounded-lg text-white px-3 py-2 font-medium transition ${loading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}>
                    {loading ? 'Guardando...' : 'Registrar Gasto'}
                </button>
            </form>
            
            <Card title="Carga Masiva (CSV)" className="border-dashed border-2 border-neutral-300">
                <p className="text-xs text-neutral-500 mb-2">Formato de 5 columnas: <code>{GASTOS_CSV_COLUMNS.join(', ')}</code></p>
                <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={loading} className="text-sm" />
            </Card>
        </div>
    );
};

// -------------------------------------------------------------------------
// --- 3. Componente de Inventario ---
// -------------------------------------------------------------------------
const InventoryForm = ({ branches, loading, setLoading }) => {
    const today = new Date();
    const [month, setMonth] = useState(today.toISOString().substring(0, 7)); 
    const [type, setType] = useState('inicial');
    const [amount, setAmount] = useState('');
    const [branch, setBranch] = useState(branches?.[0]?.id || ''); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 0) return alert('Monto inválido.');
        if (!branch) return alert('Debes seleccionar una sucursal.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'inventarios'), {
                month,
                type,
                amount: numAmount,
                branch,
                timestamp: Timestamp.now(), 
            });
            setAmount('');
        } catch (error) {
            console.error('Error al registrar inventario: ', error);
            alert('Error al registrar inventario.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium block">Mes de Inventario</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Tipo</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                    <option value="inicial">Inventario Inicial</option> 
                    <option value="final">Inventario Final</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Monto ({fmt(0, 'C$').split(' ')[0]})</label>
                <NumberInput value={amount} onChange={setAmount} placeholder="100000.00" required />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Sucursal</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required>
                     <option value="" disabled>Seleccione una sucursal</option>
                     {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <button type="submit" disabled={loading || !branch} className={`w-full rounded-lg text-white px-3 py-2 font-medium transition ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? 'Guardando...' : 'Registrar Inventario'}
            </button>
        </form>
    );
};

// -------------------------------------------------------------------------
// --- 4. Componente de Compras ---
// -------------------------------------------------------------------------
const PurchasesForm = ({ loading, setLoading }) => {
    const today = new Date();
    const [month, setMonth] = useState(today.toISOString().substring(0, 7)); 
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) return alert('Monto inválido.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'compras'), {
                month,
                amount: numAmount,
                timestamp: Timestamp.now(), 
            });
            setAmount('');
        } catch (error) {
            console.error('Error al registrar compras: ', error);
            alert('Error al registrar compras.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <label className="text-sm font-medium block">Mes de Compras</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" required />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium block">Total Compras Proveedores ({fmt(0, 'C$').split(' ')[0]})</label>
                <NumberInput value={amount} onChange={setAmount} placeholder="500000.00" required />
            </div>
            <button type="submit" disabled={loading} className={`w-full rounded-lg text-white px-3 py-2 font-medium transition ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {loading ? 'Guardando...' : 'Registrar Compras'}
            </button>
        </form>
    );
};


// -------------------------------------------------------------------------
// --- 5. Componente Principal: DataEntry (Exportación Nombrada) ---
// -------------------------------------------------------------------------
    
export function DataEntry({ categories, branches, data, onDataChange }) {
    const [activeTab, setActiveTab] = useState('Ingresos');
    const [loading, setLoading] = useState(false);
    
    // 🚨 ESTADO UNIFICADO DE FILTRO PARA TODOS LOS TABS
    const [filterMonth, setFilterMonth] = useState({
        Ingresos: getCurrentMonth(),
        Gastos: getCurrentMonth(),
        Inventario: getCurrentMonth(),
        Compras: getCurrentMonth(),
    });

    const tabs = ['Ingresos', 'Gastos', 'Inventario', 'Compras'];

    const forms = {
        Ingresos: <IncomeForm branches={branches} loading={loading} setLoading={setLoading} />,
        Gastos: <ExpenseForm categories={categories} branches={branches} loading={loading} setLoading={setLoading} />,
        Inventario: <InventoryForm branches={branches} loading={loading} setLoading={setLoading} />,
        Compras: <PurchasesForm loading={loading} setLoading={setLoading} />,
    };

    // Helper para actualizar el filtro de un tab específico
    const handleFilterChange = (tab, value) => {
        setFilterMonth(prev => ({ ...prev, [tab]: value }));
    };

    // Definiciones de campos para EditableList
    const fields = {
        Ingresos: {
            date: { label: 'Fecha', type: 'date' },
            amount: { label: 'Monto', type: 'currency' },
            branch: { label: 'Sucursal', type: 'text' },
            timestamp: { label: 'Registro', type: 'date-time' }, 
        },
        Gastos: {
            date: { label: 'Fecha', type: 'date' },
            description: { label: 'Descripción', type: 'text' },
            category: { label: 'Categoría', type: 'text' },
            amount: { label: 'Monto', type: 'currency' },
            branch: { label: 'Sucursal', type: 'text' },
            timestamp: { label: 'Registro', type: 'date-time' },
        },
        Inventario: {
            month: { label: 'Mes', type: 'text' },
            type: { label: 'Tipo', type: 'text' },
            branch: { label: 'Sucursal', type: 'text' },
            amount: { label: 'Monto', type: 'currency' },
            timestamp: { label: 'Registro', type: 'date-time' },
        },
        Compras: {
            month: { label: 'Mes', type: 'text' },
            amount: { label: 'Total', type: 'currency' },
            timestamp: { label: 'Registro', type: 'date-time' },
        },
    };

    const collectionName = activeTab.toLowerCase();
    
    let finalCollectionName = collectionName;
    if (finalCollectionName === 'inventario') {
        finalCollectionName = 'inventarios';
    }
    // Asumimos que 'ingresos', 'gastos' y 'compras' ya son los nombres correctos de colección.
    
    // 🚨 LÓGICA UNIFICADA DE FILTRADO
    const filteredListData = useMemo(() => {
        const records = data[finalCollectionName] || [];
        const filterValue = filterMonth[activeTab]; // YYYY-MM
        
        if (!filterValue) {
            return records;
        }

        // Determinar la clave de filtrado: 'month' para Inventario/Compras, 'date' para Ingresos/Gastos
        const filterKey = (activeTab === 'Inventario' || activeTab === 'Compras') ? 'month' : 'date';

        return records.filter(item => {
            const itemValue = item[filterKey]; 
            
            if (!itemValue) return false;
            
            // Filtra por los primeros 7 caracteres (YYYY-MM)
            return itemValue.substring(0, 7) === filterValue;
        });

    }, [data, activeTab, filterMonth, finalCollectionName]);


    return (
        <Card title="Módulo de Registro de Datos">
            <div className="flex border-b mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-4 text-sm font-medium transition ${activeTab === tab ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna de Formulario */}
                <div className="lg:col-span-1">
                    <Card title={`Registrar ${activeTab}`} className="h-full border-2 border-dashed border-emerald-300 bg-emerald-50/50">
                        {forms[activeTab]}
                    </Card>
                </div>
                
                {/* Columna de Edición de Registros */}
                <div className="lg:col-span-2">
                    <EditableList 
                        title={`Registros Recientes de ${activeTab} (Edición en línea)`}
                        
                        // 🚨 Usamos la lista filtrada
                        data={filteredListData} 
                        
                        collectionName={finalCollectionName}
                        
                        fields={fields[activeTab]}
                        
                        onDataChange={(newData) => onDataChange(finalCollectionName, newData)}
                        
                        // 🚨 PROPS DEL FILTRO (ACTIVOS PARA TODOS LOS TABS)
                        showMonthFilter={true} 
                        filterMonth={filterMonth[activeTab]}
                        onFilterChange={(value) => handleFilterChange(activeTab, value)}
                    />
                </div>
            </div>
        </Card>
    );
}