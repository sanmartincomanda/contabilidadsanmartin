// src/components/DataEntry.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import {
    collection, addDoc, Timestamp, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc
} from 'firebase/firestore';
import Papa from 'papaparse';
import { DEFAULT_BRANCH_ID, DEFAULT_BRANCH_NAME, fmt, branchName } from '../constants';
import { getDepreciationEndMonth, getMonthlyDepreciationAmount } from '../services/depreciation';
import { resolveIncomeEntries } from '../services/incomeAggregation';
import { syncSicarDailyIncome } from '../services/sicarIncomeSync';
import { deletePurchaseTransaction, updatePurchaseTransaction } from '../services/linkedTransactions';
import { getLocalDateString, getLocalMonthString } from '../utils/localDate';

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
    calculator: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
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

const Card = ({ title, children, className = "", right, icon, gradient = false }) => (
    <div className={`erp-panel erp-panel-hover rounded-[24px] overflow-hidden ${className}`}>
        <div className={`flex justify-between items-center px-5 py-3.5 border-b ${gradient ? 'bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] border-[#203446]' : 'erp-panel-header border-[#c5dce7]'}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className={`p-2 rounded-xl ${gradient ? 'bg-white/12' : 'bg-[#eaf7fc]'}`}>
                        <Icon path={Icons[icon]} className={`w-4 h-4 ${gradient ? 'text-white' : 'text-[#0a628f]'}`} />
                    </div>
                )}
                <h3 className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${gradient ? 'text-white' : 'text-[#5d7784]'}`}>{title}</h3>
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
        purple: 'bg-[#173545] hover:bg-[#102734] text-white',
        sky: 'bg-sky-600 hover:bg-sky-700 text-white',
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
    <div className="space-y-1">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-[#61727f]">{label}</label>}
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
        default: 'bg-slate-100 text-slate-600',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        danger: 'bg-red-50 text-red-700 border border-red-200',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200',
        info: 'bg-[#fff0f0] text-[#a81d24] border border-red-100',
        purple: 'bg-violet-50 text-violet-700 border border-violet-200'
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${variants[variant]}`}>{children}</span>;
};

const normalizeFilterText = (value) => (
    String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
);

// --- COMPONENTE: EDITABLE LIST ---

const EditableRow = ({ item, collectionName, fields, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(item);
    const [loading, setLoading] = useState(false);

    const buildBlockingMessage = (blockingAbonos = []) => {
        const abonosLabel = blockingAbonos.map((abono) => `#${abono.secuencia || abono.id}`).join(', ');
        return `No se puede eliminar esta compra porque la factura asociada ya tiene abono(s) ${abonosLabel}. Anulalos primero desde Cuentas por Pagar.`;
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const dataToSave = {};
            for (const key in editData) {
                if (key === 'id') continue;
                if (fields[key]?.readonly) continue;
                if (fields[key]?.type === 'number' || fields[key]?.type === 'currency') {
                    dataToSave[key] = parseFloat(editData[key]) || 0;
                } else if (key === 'timestamp') {
                    continue;
                } else {
                    dataToSave[key] = editData[key];
                }
            }

            let savedData = dataToSave;
            if (collectionName === 'compras') {
                const result = await updatePurchaseTransaction(item.id, dataToSave);
                if (result?.missing) {
                    throw new Error('La compra ya no existe.');
                }
                savedData = result?.purchase || dataToSave;
            } else {
                await updateDoc(doc(db, collectionName, item.id), dataToSave);
            }

            setIsEditing(false);
            onUpdate(item.id, savedData);
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
            if (collectionName === 'compras') {
                const result = await deletePurchaseTransaction(item.id);
                if (result?.blocked) {
                    alert(buildBlockingMessage(result.blockingAbonos));
                    return;
                }
            } else {
                await deleteDoc(doc(db, collectionName, item.id));
            }
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
        if (field?.type === 'branch') return branchName(value);
        if (field?.type === 'currency') return fmt(Number(value));
        return String(value);
    };

    const renderInput = (key, value) => {
        const field = fields[key];
        if (key === 'timestamp') return <span className='text-stone-400 text-xs'>No editable</span>;
        if (field?.readonly) return <span className='text-stone-400 text-xs'>No editable</span>;

        if (field?.type === 'branch') {
            return (
                <select
                    value={value === null || value === undefined ? '' : String(value)}
                    onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                    className="w-full rounded border border-[#a81d24]/40 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#a81d24]/30"
                    disabled={loading}
                >
                    <option value="">Seleccionar...</option>
                    {(field.options || []).map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                </select>
            );
        }

        const type = field?.type === 'currency' || field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : field?.type === 'month' ? 'month' : 'text';

        return (
            <input
                type={type}
                step={type === 'number' ? '0.01' : undefined}
                value={value === null || value === undefined ? '' : String(value)}
                onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                className="w-full rounded border border-[#a81d24]/40 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#a81d24]/30"
                disabled={loading}
            />
        );
    };

    return (
        <tr className="border-b border-slate-100 transition-colors">
            {Object.keys(fields).map(key => (
                <td key={key} className="py-2.5 px-3 text-sm">
                    {isEditing ? renderInput(key, editData[key]) : renderValue(key, item[key])}
                </td>
            ))}
            <td className="py-2.5 px-3 whitespace-nowrap">
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

const EditableList = ({
    data,
    collectionName,
    fields,
    filterValue,
    filterType = 'month',
    filterLabel = 'Filtrar por Mes',
    onFilterChange,
    advancedFilters = {},
    advancedFilterConfig = [],
    onAdvancedFiltersChange,
}) => {
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
        const dateStr = item.date || item.fecha || item.depreciateFrom || item.purchaseDate || item.month || item.mes;
        if (!dateStr) return new Date(0);
        return new Date(dateStr);
    };

    const getItemDateString = (item) => {
        const dateStr = item.date || item.fecha || item.depreciateFrom || item.purchaseDate || item.month || item.mes || '';
        return String(dateStr);
    };

    const itemMatchesText = (item, keys = [], filterText = '') => {
        const normalizedFilter = normalizeFilterText(filterText);
        if (!normalizedFilter) return true;
        return keys.some((key) => normalizeFilterText(item[key]).includes(normalizedFilter));
    };

    const filteredData = useMemo(() => {
        let result = localData;

        if (filterValue) {
            result = localData.filter(item => {
                const itemDate = item.date || item.month || item.fecha || item.mes;
                if (!itemDate) return false;
                return filterType === 'date'
                    ? itemDate.substring(0, 10) === filterValue
                    : itemDate.substring(0, 7) === filterValue;
            });
        }

        if (advancedFilters.dateFrom) {
            result = result.filter((item) => {
                const itemDate = getItemDateString(item).substring(0, 10);
                return itemDate && itemDate >= advancedFilters.dateFrom;
            });
        }

        if (advancedFilters.dateTo) {
            result = result.filter((item) => {
                const itemDate = getItemDateString(item).substring(0, 10);
                return itemDate && itemDate <= advancedFilters.dateTo;
            });
        }

        advancedFilterConfig.forEach((filterField) => {
            if (['dateFrom', 'dateTo'].includes(filterField.key)) return;
            const fieldValue = advancedFilters[filterField.key];
            if (!fieldValue) return;
            result = result.filter((item) => itemMatchesText(item, filterField.keys || [filterField.key], fieldValue));
        });

        return result.sort((a, b) => {
            const dateA = getItemDate(a);
            const dateB = getItemDate(b);
            return dateB - dateA;
        });
    }, [advancedFilterConfig, advancedFilters, filterType, filterValue, localData]);

    const hasData = filteredData && filteredData.length > 0;

    return (
        <div className="mt-4">
            {onFilterChange && (
                <div className="erp-filter-panel mb-4 space-y-3 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <label className="text-xs font-bold text-[#61727f] uppercase tracking-wider">{filterLabel}:</label>
                        <input
                            type={filterType}
                            value={filterValue}
                            onChange={(e) => onFilterChange(e.target.value)}
                            className="erp-focus w-full rounded-xl border border-[#ccd7df] bg-white px-3 py-2 text-sm font-semibold text-[#30414f] outline-none sm:w-auto"
                        />
                        {filterValue && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => onFilterChange('')} className="w-full sm:w-auto">
                                Limpiar
                            </Button>
                        )}
                    </div>

                    {advancedFilterConfig.length > 0 && onAdvancedFiltersChange && (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {advancedFilterConfig.map((filterField) => (
                                <div key={filterField.key} className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#61727f]">
                                        {filterField.label}
                                    </label>
                                    <input
                                        type={filterField.type || 'text'}
                                        value={advancedFilters[filterField.key] || ''}
                                        placeholder={filterField.placeholder || ''}
                                        onChange={(e) => onAdvancedFiltersChange(filterField.key, e.target.value)}
                                        className="erp-focus w-full rounded-xl border border-[#ccd7df] bg-white px-3 py-1.5 text-sm font-semibold text-[#30414f] outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!hasData ? (
                <div className="erp-empty-state p-8 text-center">
                    <Icon path={Icons.alertCircle} className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-sm">
                        {filterValue ? `No hay registros para ${filterValue}` : "No hay registros recientes"}
                    </p>
                </div>
            ) : (
                <div className="erp-table-shell overflow-x-auto">
                    <table className="min-w-[760px] w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-[#dbe2e8]">
                                {Object.values(fields).map(field => (
                                    <th key={field.label} className="px-3 py-2.5">{field.label}</th>
                                ))}
                                <th className="px-3 py-2.5">Acciones</th>
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

const IncomeForm = ({ loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(getLocalDateString());
    const [description, setDescription] = useState('VENTA DEL DIA');
    const [reference, setReference] = useState('');
    const [amount, setAmount] = useState('');
    const [syncDate, setSyncDate] = useState(getLocalDateString());
    const [syncLoading, setSyncLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!description.trim()) return alert('Complete fecha, detalle y monto.');
        if (isNaN(numAmount) || numAmount <= 0) return alert('Monto inválido.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'ingresos'), {
                date,
                month: date.substring(0, 7),
                description: description.trim().toUpperCase(),
                reference: reference.trim().toUpperCase(),
                amount: numAmount,
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                source: 'manual',
                sourceLabel: 'MANUAL',
                timestamp: Timestamp.now(),
                is_conciled: false,
            });
            setDescription('VENTA DEL DIA');
            setReference('');
            setAmount('');
            onSuccess?.();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncIncome = async () => {
        setSyncLoading(true);
        try {
            const result = await syncSicarDailyIncome({ date: syncDate });
            const syncedTotal = Number(result?.totalAmount || 0);
            const syncedCount = Number(result?.syncedCount || 0);
            const syncedDate = result?.startDate || syncDate;
            alert(`SICAR sincronizado para ${syncedDate}: ${syncedCount} registro(s) por ${fmt(syncedTotal)}.`);
            onSuccess?.();
        } catch (error) {
            console.error('Error sincronizando SICAR:', error);
            alert(error?.message || 'No se pudo sincronizar desde SICAR.');
        } finally {
            setSyncLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="erp-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
                Base: {DEFAULT_BRANCH_NAME}
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Sincronizar desde SICAR</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">Sincroniza el total diario sin duplicar el ingreso manual del mismo dia.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Fecha SICAR" type="date" icon="calendar" value={syncDate} onChange={e => setSyncDate(e.target.value)} />
                    <Button type="button" variant="success" disabled={syncLoading} className="self-end w-full" onClick={handleSyncIncome}>
                        {syncLoading ? 'Sincronizando...' : 'Sincronizar SICAR'}
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">Ingreso manual</h4>
                <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
                <Input label="Detalle del ingreso" icon="fileText" placeholder="Ej: Venta del dia, deposito..." value={description} onChange={e => setDescription(e.target.value)} required />
                <Input label="Referencia" icon="receipt" placeholder="Ej: Cierre caja, nota interna..." value={reference} onChange={e => setReference(e.target.value)} />
                <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-emerald-600" value={amount} onChange={e => setAmount(e.target.value)} required />
                <Button type="submit" variant="success" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar Ingreso'}</Button>
            </form>
        </div>
    );
};

const ExpenseForm = ({ categories, loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(getLocalDateString());
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;
        if (!description || isNaN(numAmount) || numAmount <= 0 || !selectedCategoryName) return alert('Complete todos los campos.');

        setLoading(true);
        try {
            await addDoc(collection(db, 'gastos'), {
                date,
                description,
                amount: numAmount,
                category: selectedCategoryName,
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                timestamp: Timestamp.now(),
                is_conciled: false,
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
                    date: row['Fecha'] || getLocalDateString(),
                    description: row['Descripcion'] || 'Sin Descripción',
                    amount: parseFloat(row['Monto']),
                    category: row['Categoria'] || 'Otros',
                    branch: DEFAULT_BRANCH_ID,
                    branchName: DEFAULT_BRANCH_NAME,
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
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="erp-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
                    Base: {DEFAULT_BRANCH_NAME}
                </div>
                <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
                <Input label="Descripción" icon="fileText" placeholder="Ej: Pago de servicios..." value={description} onChange={e => setDescription(e.target.value)} required />
                <div className="grid grid-cols-2 gap-3">
                    <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-rose-600" value={amount} onChange={e => setAmount(e.target.value)} required />
                    <Select label="Categoría" icon="tag" value={categoryId} onChange={e => setCategoryId(e.target.value)} required options={<><option value="">Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>} />
                </div>
                <Button type="submit" variant="danger" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar Gasto'}</Button>
            </form>
            <div className="border-t border-stone-200 pt-4">
                <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-4 text-center">
                    <Icon path={Icons.upload} className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                    <h4 className="font-bold text-stone-700 text-xs uppercase tracking-wider mb-2">Carga Masiva CSV</h4>
                    <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={loading} className="block w-full text-xs text-stone-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer" />
                </div>
            </div>
        </div>
    );
};

// --- OTROS FORMULARIOS ---

const getCurrentMonth = () => {
    return getLocalMonthString();
};

const InventoryForm = ({ loading, setLoading, onSuccess }) => {
    const [month, setMonth] = useState(getCurrentMonth());
    const [type, setType] = useState('inicial');
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'inventarios'), {
                month,
                type,
                amount: Number(amount) || 0,
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                timestamp: Timestamp.now()
            });
            setAmount(''); onSuccess?.();
        } catch (error) { alert('Error'); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="erp-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
                Base: {DEFAULT_BRANCH_NAME}
            </div>
            <Input label="Mes" type="month" icon="calendar" value={month} onChange={e => setMonth(e.target.value)} required />
            <Select label="Tipo" icon="box" value={type} onChange={e => setType(e.target.value)} options={<><option value="inicial">Inicial</option><option value="final">Final</option></>} />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="primary" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar'}</Button>
        </form>
    );
};

const PurchasesForm = ({ loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(getLocalDateString());
    const [supplier, setSupplier] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!supplier.trim() || isNaN(numAmount) || numAmount <= 0) {
            return alert('Complete proveedor y monto.');
        }
        setLoading(true);
        try {
            await addDoc(collection(db, 'compras'), {
                date,
                month: date.substring(0, 7),
                supplier: supplier.trim().toUpperCase(),
                invoiceNumber: invoiceNumber.trim() || 'S/N',
                amount: numAmount,
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                paymentType: 'contado',
                isInventoryCost: true,
                timestamp: Timestamp.now(),
            });
            setSupplier('');
            setInvoiceNumber('');
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
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-semibold text-emerald-700">
                Compra de contado
            </div>
            <div className="erp-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
                Base: {DEFAULT_BRANCH_NAME}
            </div>
            <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
            <Input label="Proveedor" icon="users" placeholder="Nombre del proveedor" value={supplier} onChange={e => setSupplier(e.target.value)} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Numero de Factura" icon="fileText" placeholder="Ej: 001-001-000000001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                <Input label="Monto Factura" type="number" step="0.01" icon="shoppingCart" placeholder="0.00" className="text-lg font-bold text-purple-600" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <Button type="submit" variant="purple" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar Compra de Contado'}</Button>
        </form>
    );
};

const DepreciationForm = ({ loading, setLoading, onSuccess }) => {
    const [depreciationType, setDepreciationType] = useState('');
    const [amount, setAmount] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(getLocalDateString());
    const [depreciateFrom, setDepreciateFrom] = useState(getLocalDateString());
    const [usefulLifeYears, setUsefulLifeYears] = useState('');

    const monthlyPreview = useMemo(() => {
        const previewAmount = Number(amount);
        const previewYears = Number(usefulLifeYears);
        if (!previewAmount || !previewYears) return 0;
        return getMonthlyDepreciationAmount({ amount: previewAmount, usefulLifeYears: previewYears });
    }, [amount, usefulLifeYears]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = Number(amount);
        const numYears = Number(usefulLifeYears);

        if (!depreciationType.trim() || !purchaseDate || !depreciateFrom) {
            return alert('Complete tipo, fecha de compra e inicio de depreciacion.');
        }
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return alert('Monto invalido.');
        }
        if (!Number.isFinite(numYears) || numYears <= 0) {
            return alert('Ingrese anos de depreciacion validos.');
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'depreciaciones'), {
                depreciationType: depreciationType.trim().toUpperCase(),
                amount: numAmount,
                purchaseDate,
                depreciateFrom,
                usefulLifeYears: numYears,
                month: depreciateFrom.substring(0, 7),
                branch: DEFAULT_BRANCH_ID,
                branchName: DEFAULT_BRANCH_NAME,
                timestamp: Timestamp.now(),
            });
            setDepreciationType('');
            setAmount('');
            setPurchaseDate(getLocalDateString());
            setDepreciateFrom(getLocalDateString());
            setUsefulLifeYears('');
            onSuccess?.();
        } catch (error) {
            console.error('Error guardando depreciacion:', error);
            alert('Error al guardar depreciacion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-full border border-[#cfd9df] bg-[#f4f8fb] px-4 py-2 text-[11px] font-semibold text-[#355161]">
                Depreciacion lineal mensual
            </div>
            <div className="erp-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold">
                Base: {DEFAULT_BRANCH_NAME}
            </div>
            <Input
                label="Tipo de depreciacion"
                icon="calculator"
                placeholder="Ej: Equipo frio, vehiculo, mobiliario..."
                value={depreciationType}
                onChange={(e) => setDepreciationType(e.target.value)}
                required
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <Input label="Anos de depreciacion" type="number" step="0.01" icon="calendar" placeholder="0" value={usefulLifeYears} onChange={(e) => setUsefulLifeYears(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Fecha de compra" type="date" icon="calendar" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
                <Input label="Depreciar a partir de" type="date" icon="calendar" value={depreciateFrom} onChange={(e) => setDepreciateFrom(e.target.value)} required />
            </div>
            <div className="rounded-2xl border border-[#d7e2e9] bg-[#f8fbfd] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Depreciacion mensual estimada</div>
                <div className="mt-1 text-lg font-black text-[#16222d]">{fmt(monthlyPreview)}</div>
            </div>
            <Button type="submit" variant="primary" disabled={loading} className="w-full">
                {loading ? 'Guardando...' : 'Registrar Depreciacion'}
            </Button>
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
        <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Mes" type="month" icon="calendar" value={month} onChange={e => setMonth(e.target.value)} required />
            <Select label="Categoría" icon="tag" value={categoryId} onChange={e => setCategoryId(e.target.value)} required options={<><option value="">Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>} />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="warning" disabled={loading || !categoryId} className="w-full">{loading ? 'Guardando...' : 'Establecer Presupuesto'}</Button>
        </form>
    );
};

const ReceivableForm = ({ loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(getLocalDateString());
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
        <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
            <Input label="Cliente/Concepto" icon="users" placeholder="Nombre..." value={description} onChange={e => setDescription(e.target.value)} required />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-sky-600" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="sky" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar'}</Button>
        </form>
    );
};

const EquityForm = ({ loading, setLoading, onSuccess }) => {
    const [date, setDate] = useState(getLocalDateString());
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
        <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Fecha" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} required />
            <Input label="Descripción" icon="scale" placeholder="Capital, aporte..." value={description} onChange={e => setDescription(e.target.value)} required />
            <Input label="Monto" type="number" step="0.01" icon="dollar" placeholder="0.00" className="text-lg font-bold text-emerald-600" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Button type="submit" variant="success" disabled={loading} className="w-full">{loading ? 'Guardando...' : 'Registrar Patrimonio'}</Button>
        </form>
    );
};

// --- COMPONENTE PRINCIPAL ---

const VALID_TABS = ['Ingresos', 'Gastos', 'Inventario', 'Compras', 'Depreciaciones', 'Presupuesto', 'Cuentas por Cobrar', 'Patrimonio'];

export function DataEntry({ categories, data }) {
    const [searchParams] = useSearchParams();
    const urlTab = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState(() => {
        return VALID_TABS.includes(urlTab) ? urlTab : 'Ingresos';
    });
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (urlTab && VALID_TABS.includes(urlTab)) {
            setActiveTab(urlTab);
        }
    }, [urlTab]);

    const [filterMonth, setFilterMonth] = useState({
        Ingresos: getLocalDateString(),
        Gastos: getCurrentMonth(),
        Inventario: getCurrentMonth(),
        Compras: getCurrentMonth(),
        Depreciaciones: getCurrentMonth(),
        Presupuesto: getCurrentMonth(),
        'Cuentas por Cobrar': getCurrentMonth(),
        Patrimonio: getCurrentMonth(),
    });

    const [advancedFilters, setAdvancedFilters] = useState({
        Ingresos: { dateFrom: '', dateTo: '', search: '' },
        Gastos: { dateFrom: '', dateTo: '', search: '' },
        Inventario: {},
        Compras: { dateFrom: '', dateTo: '', supplier: '', invoiceNumber: '' },
        Depreciaciones: { dateFrom: '', dateTo: '', depreciationType: '' },
        Presupuesto: {},
        'Cuentas por Cobrar': {},
        Patrimonio: {},
    });

    const tabsConfig = {
        'Ingresos': { icon: 'trendingUp', label: 'Ingresos' },
        'Gastos': { icon: 'trendingDown', label: 'Gastos' },
        'Inventario': { icon: 'box', label: 'Inventario' },
        'Compras': { icon: 'shoppingCart', label: 'Compras' },
        'Depreciaciones': { icon: 'calculator', label: 'Depreciaciones' },
        'Presupuesto': { icon: 'target', label: 'Presupuesto' },
        'Cuentas por Cobrar': { icon: 'handCoin', label: 'C. Cobrar' },
        'Patrimonio': { icon: 'scale', label: 'Patrimonio' }
    };

    const filterConfig = {
        Ingresos: { type: 'date', label: 'Filtrar por Dia' },
        Gastos: { type: 'month', label: 'Filtrar por Mes' },
        Inventario: { type: 'month', label: 'Filtrar por Mes' },
        Compras: { type: 'month', label: 'Filtrar por Mes' },
        Depreciaciones: { type: 'month', label: 'Filtrar por Inicio Dep.' },
        Presupuesto: { type: 'month', label: 'Filtrar por Mes' },
        'Cuentas por Cobrar': { type: 'month', label: 'Filtrar por Mes' },
        Patrimonio: { type: 'month', label: 'Filtrar por Mes' },
    };

    const handleSuccess = () => setRefreshKey(prev => prev + 1);

    const handleFilterChange = (tab, value) => {
        setFilterMonth(prev => ({ ...prev, [tab]: value }));
    };

    const handleAdvancedFilterChange = (tab, key, value) => {
        setAdvancedFilters((prev) => ({
            ...prev,
            [tab]: { ...(prev[tab] || {}), [key]: value },
        }));
    };

    const fieldsConfig = {
        Ingresos: {
            date: { label: 'Fecha', type: 'date' },
            description: { label: 'Detalle', type: 'text' },
            reference: { label: 'Referencia', type: 'text' },
            sourceLabel: { label: 'Origen', type: 'text', readonly: true },
            amount: { label: 'Monto', type: 'currency' }
        },
        Gastos: {
            date: { label: 'Fecha', type: 'date' },
            description: { label: 'Descripción', type: 'text' },
            category: { label: 'Categoría', type: 'text' },
            amount: { label: 'Monto', type: 'currency' }
        },
        Inventario: {
            month: { label: 'Mes', type: 'month' },
            type: { label: 'Tipo', type: 'text' },
            amount: { label: 'Monto', type: 'currency' }
        },
        Compras: {
            date: { label: 'Fecha', type: 'date' },
            month: { label: 'Mes', type: 'month' },
            supplier: { label: 'Proveedor', type: 'text' },
            invoiceNumber: { label: 'Factura', type: 'text' },
            paymentType: { label: 'Tipo', type: 'text' },
            amount: { label: 'Monto', type: 'currency' }
        },
        Depreciaciones: {
            depreciationType: { label: 'Tipo', type: 'text' },
            purchaseDate: { label: 'Fecha compra', type: 'date' },
            depreciateFrom: { label: 'Inicia dep.', type: 'date' },
            usefulLifeYears: { label: 'Anos', type: 'number' },
            monthlyDepreciation: { label: 'Mensual', type: 'currency', readonly: true },
            endMonth: { label: 'Fin', type: 'month', readonly: true },
            amount: { label: 'Monto', type: 'currency' }
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

    const advancedFilterConfig = {
        Ingresos: [
            { key: 'dateFrom', label: 'Desde', type: 'date' },
            { key: 'dateTo', label: 'Hasta', type: 'date' },
            { key: 'search', label: 'Detalle / Referencia', type: 'text', placeholder: 'Buscar ingreso...', keys: ['description', 'reference', 'sourceLabel'] },
        ],
        Gastos: [
            { key: 'dateFrom', label: 'Desde', type: 'date' },
            { key: 'dateTo', label: 'Hasta', type: 'date' },
            { key: 'search', label: 'Descripcion / Categoria', type: 'text', placeholder: 'Buscar gasto...', keys: ['description', 'category'] },
        ],
        Compras: [
            { key: 'dateFrom', label: 'Desde', type: 'date' },
            { key: 'dateTo', label: 'Hasta', type: 'date' },
            { key: 'supplier', label: 'Proveedor', type: 'text', placeholder: 'Buscar proveedor...', keys: ['supplier'] },
            { key: 'invoiceNumber', label: 'No. Factura', type: 'text', placeholder: 'Buscar factura...', keys: ['invoiceNumber'] },
        ],
        Depreciaciones: [
            { key: 'dateFrom', label: 'Desde', type: 'date' },
            { key: 'dateTo', label: 'Hasta', type: 'date' },
            { key: 'depreciationType', label: 'Tipo', type: 'text', placeholder: 'Buscar tipo...', keys: ['depreciationType'] },
        ],
    };

    const getListData = () => {
        const collectionMap = {
            'Ingresos': 'ingresos',
            'Gastos': 'gastos',
            'Inventario': 'inventarios',
            'Compras': 'compras',
            'Depreciaciones': 'depreciaciones',
            'Presupuesto': 'presupuestos',
            'Cuentas por Cobrar': 'cuentasPorCobrar',
            'Patrimonio': 'patrimonio'
        };

        if (activeTab === 'Ingresos') {
            return resolveIncomeEntries(data.ingresos || []).map((item) => ({
                ...item,
                date: item.date || item.fecha || '',
                description: item.description || item.detalle || 'INGRESO DEL DIA',
                reference: item.reference || item.referencia || '',
                amount: Number(item.amount ?? item.monto ?? 0) || 0,
                sourceLabel: item.source === 'sicar' ? 'SICAR' : 'MANUAL',
            }));
        }

        if (activeTab === 'Compras') {
            return (data.compras || []).map((item) => ({
                ...item,
                date: item.date || item.fecha || '',
                month: item.month || ((item.date || item.fecha) ? (item.date || item.fecha).substring(0, 7) : ''),
                supplier: item.supplier || item.proveedor || 'REGISTRO LEGACY',
                invoiceNumber: item.invoiceNumber || item.numero || '',
                branch: item.branch || DEFAULT_BRANCH_ID,
                branchName: item.branchName || DEFAULT_BRANCH_NAME,
                paymentType: item.paymentType || (item.sourceFacturaId || item.linkedPayableId ? 'credito' : ((item.date || item.fecha) ? 'contado' : 'legacy')),
            }));
        }

        if (activeTab === 'Depreciaciones') {
            return (data.depreciaciones || []).map((item) => ({
                ...item,
                depreciationType: item.depreciationType || item.type || '',
                purchaseDate: item.purchaseDate || item.date || '',
                depreciateFrom: item.depreciateFrom || item.startDate || '',
                month: item.month || ((item.depreciateFrom || item.startDate) ? (item.depreciateFrom || item.startDate).substring(0, 7) : ''),
                usefulLifeYears: Number(item.usefulLifeYears ?? item.years ?? 0) || 0,
                monthlyDepreciation: getMonthlyDepreciationAmount(item),
                endMonth: getDepreciationEndMonth(item),
                amount: Number(item.amount ?? item.monto ?? 0) || 0,
            }));
        }

        return data[collectionMap[activeTab]] || [];
    };

    const getCollectionName = () => {
        const map = {
            'Ingresos': 'ingresos',
            'Gastos': 'gastos',
            'Inventario': 'inventarios',
            'Compras': 'compras',
            'Depreciaciones': 'depreciaciones',
            'Presupuesto': 'presupuestos',
            'Cuentas por Cobrar': 'cuentasPorCobrar',
            'Patrimonio': 'patrimonio'
        };
        return map[activeTab];
    };

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
                        <div className="erp-page-title">Manual capture</div>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Data entry</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="erp-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                            {tabsConfig[activeTab].label}
                        </span>
                        <span className="rounded-full border border-[#d7dfe6] bg-white px-3 py-1 text-xs font-semibold text-[#5d7784]">
                            {DEFAULT_BRANCH_NAME}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="erp-command-strip rounded-[24px] p-2 no-print">
                <div className="erp-mobile-tabs -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                    {Object.entries(tabsConfig).map(([tab, config]) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`erp-pressable flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                                activeTab === tab
                                    ? 'bg-[#152533] text-white shadow-[0_16px_26px_-18px_rgba(15,23,42,.8)]'
                                    : 'text-[#5b6e7b] hover:bg-white'
                            }`}
                        >
                            <Icon path={Icons[config.icon]} className="w-3.5 h-3.5" />
                            {config.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
                <div className="no-print animate-fade-in">
                    <Card title={`Captura activa · ${tabsConfig[activeTab].label}`} icon={tabsConfig[activeTab].icon} gradient={true}>
                        {activeTab === 'Ingresos' && <IncomeForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        {activeTab === 'Gastos' && <ExpenseForm categories={categories} loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        {activeTab === 'Inventario' && <InventoryForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        {activeTab === 'Compras' && <PurchasesForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        {activeTab === 'Depreciaciones' && <DepreciationForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        {activeTab === 'Presupuesto' && <BudgetForm categories={categories} loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        {activeTab === 'Cuentas por Cobrar' && <ReceivableForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                        {activeTab === 'Patrimonio' && <EquityForm loading={loading} setLoading={setLoading} onSuccess={handleSuccess} />}
                    </Card>
                </div>

                <div className="animate-fade-in">
                    <Card title={`Historial operativo · ${tabsConfig[activeTab].label}`} icon="receipt">
                        <EditableList
                            data={getListData()}
                            collectionName={getCollectionName()}
                            fields={fieldsConfig[activeTab]}
                            filterValue={filterMonth[activeTab]}
                            filterType={filterConfig[activeTab].type}
                            filterLabel={filterConfig[activeTab].label}
                            onFilterChange={(value) => handleFilterChange(activeTab, value)}
                            advancedFilters={advancedFilters[activeTab] || {}}
                            advancedFilterConfig={advancedFilterConfig[activeTab] || []}
                            onAdvancedFiltersChange={(key, value) => handleAdvancedFilterChange(activeTab, key, value)}
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
}
