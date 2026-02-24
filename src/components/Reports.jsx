// src/components/Reports.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { BRANCHES, fmt, peso, branchName } from '../constants'; 
import BalanceSheet from './BalanceSheet';
import DashboardGeneral from './DashboardGeneral';

// --- ICONOS SVG INLINE ---
const Icons = {
    chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    scale: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    dashboard: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    chevronDown: "M19 9l-7 7-7-7",
    chevronRight: "M9 5l7 7-7 7",
    trendingUp: "M13 7h8m0 0v8m0-8l-8-8-4 4-6-6",
    trendingDown: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    wallet: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    x: "M6 18L18 6M6 6l12 12",
    filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
    alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
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

const Card = ({ title, children, className = "", right, subtitle, icon, gradient = false }) => (
    <div className={`rounded-2xl shadow-lg border border-slate-200/60 bg-white overflow-hidden ${className}`}>
        <div className={`flex justify-between items-center px-6 py-4 border-b border-slate-100 ${gradient ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className={`p-2 rounded-lg ${gradient ? 'bg-white/10' : 'bg-blue-100'}`}>
                        <Icon path={Icons[icon]} className={`w-5 h-5 ${gradient ? 'text-white' : 'text-blue-600'}`} />
                    </div>
                )}
                <div>
                    <h3 className={`text-lg font-bold ${gradient ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
                    {subtitle && <p className={`text-xs ${gradient ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
                </div>
            </div>
            {right}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const Select = ({ label, icon, value, onChange, options = [] }) => (
    <div className="space-y-2">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
        <div className="relative">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
            <select 
                value={value}
                onChange={onChange}
                className={`w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-500 focus:shadow-lg appearance-none cursor-pointer ${icon ? 'pl-11' : ''}`}
            >
                {options}
            </select>
            <Icon path={Icons.chevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
    </div>
);

const StatCard = ({ title, value, subtitle, icon, variant = 'default', trend }) => {
    const variants = {
        default: 'bg-white border-slate-200',
        primary: 'bg-blue-600 text-white border-blue-600',
        success: 'bg-emerald-600 text-white border-emerald-600',
        danger: 'bg-rose-600 text-white border-rose-600',
        warning: 'bg-amber-500 text-white border-amber-500',
        dark: 'bg-slate-800 text-white border-slate-800'
    };

    const isColored = ['primary', 'success', 'danger', 'warning', 'dark'].includes(variant);

    return (
        <div className={`rounded-2xl p-6 border shadow-lg ${variants[variant]}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${isColored ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <Icon path={Icons[icon]} className={`w-6 h-6 ${isColored ? 'text-white' : 'text-slate-600'}`} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold ${isColored ? 'text-white/80' : (parseFloat(trend) > 0 ? 'text-emerald-600' : 'text-rose-600')}`}>
                        <Icon path={parseFloat(trend) > 0 ? Icons.trendingUp : Icons.trendingDown} className="w-4 h-4" />
                        {Math.abs(parseFloat(trend))}%
                    </div>
                )}
            </div>
            <div className={`text-2xl font-black mb-1 ${isColored ? 'text-white' : 'text-slate-800'}`}>
                {value}
            </div>
            <div className={`text-sm font-bold uppercase tracking-wider ${isColored ? 'text-white/70' : 'text-slate-500'}`}>
                {title}
            </div>
            {subtitle && (
                <div className={`text-xs mt-2 ${isColored ? 'text-white/50' : 'text-slate-400'}`}>
                    {subtitle}
                </div>
            )}
        </div>
    );
};

// --- LÓGICA DE AGREGACIÓN ---
const aggregateData = (data) => {
    const results = {}; 
    const { ingresos = [], gastos = [], inventarios = [], compras = [], presupuestos = [] } = data;

    const getDateString = (firestoreDate) => {
        if (typeof firestoreDate === 'string') return firestoreDate;
        if (firestoreDate && firestoreDate.toDate) return firestoreDate.toDate().toISOString().substring(0, 10);
        return new Date().toISOString().substring(0, 10);
    };

    const purchasesByMonth = compras.reduce((acc, c) => {
        acc[c.month] = (acc[c.month] || 0) + peso(c.amount); 
        return acc;
    }, {});

    const budgetsByMonth = presupuestos.reduce((acc, p) => {
        acc[p.month] = acc[p.month] || {};
        acc[p.month][p.category] = (acc[p.month][p.category] || 0) + peso(p.amount);
        return acc;
    }, {});
    
    [...ingresos, ...gastos].forEach(item => {
        const dateString = getDateString(item.date); 
        const month = dateString.substring(0, 7); 
        const branchId = item.branch;
        
        results[month] = results[month] || {};
        results[month][branchId] = results[month][branchId] || { 
            totalIncome: 0, 
            totalExpense: 0, 
            expenseDetails: {},
            rawExpenses: [] 
        };

        const branchData = results[month][branchId];

        if (item.category) { 
            branchData.totalExpense += peso(item.amount);
            branchData.expenseDetails[item.category] = (branchData.expenseDetails[item.category] || 0) + peso(item.amount);
            branchData.rawExpenses.push({ ...item, dateStr: dateString });
        } else { 
            branchData.totalIncome += peso(item.amount);
        }
    });

    inventarios.forEach(item => {
        const month = item.month;
        const branchId = item.branch;
        if (!branchId || !month) return; 

        results[month] = results[month] || {};
        results[month][branchId] = results[month][branchId] || {
            totalIncome: 0, totalExpense: 0, expenseDetails: {}, rawExpenses: [] 
        };
        const branchData = results[month][branchId];
        
        if (item.type === 'inicial') branchData.initialInventory = peso(item.amount);
        else if (item.type === 'final') branchData.finalInventory = peso(item.amount);
    });

    return Object.entries(results).map(([month, branchesData]) => {
        const branchEntriesArray = Object.values(branchesData);
        const totalIncomeMonth = branchEntriesArray.reduce((sum, data) => sum + data.totalIncome, 0);
        const totalPurchasesGlobal = purchasesByMonth[month] || 0; 
        const monthlyBudget = budgetsByMonth[month] || {}; 
        
        const branchEntries = Object.entries(branchesData).map(([branchId, data]) => {
            const salesPercentage = totalIncomeMonth > 0 ? (data.totalIncome / totalIncomeMonth) : 0;
            const distributedPurchases = totalPurchasesGlobal * salesPercentage;
            const initialInv = data.initialInventory || 0;
            const finalInv = data.finalInventory || 0;
            
            const COGS = initialInv + distributedPurchases - finalInv;
            const grossProfit = data.totalIncome - COGS;
            const netProfit = grossProfit - data.totalExpense;

            return {
                month,
                branchId,
                branchName: branchName(branchId),
                totalIncome: data.totalIncome,
                totalExpense: data.totalExpense,
                initialInventory: initialInv,
                finalInventory: finalInv,
                totalPurchases: distributedPurchases,
                COGS: COGS,
                grossProfit: grossProfit,
                netProfit: netProfit,
                expenseDetails: Object.entries(data.expenseDetails),
                rawExpenses: data.rawExpenses,
                budgets: monthlyBudget 
            };
        });
        
        const totalInitialInv = branchEntries.reduce((sum, b) => sum + (b.initialInventory || 0), 0);
        const totalFinalInv = branchEntries.reduce((sum, b) => sum + (b.finalInventory || 0), 0);
        const totalExpenseMonth = branchEntries.reduce((sum, b) => sum + b.totalExpense, 0);
        const COGS_consolidado = totalInitialInv + totalPurchasesGlobal - totalFinalInv;

        branchEntries.push({
            month,
            branchId: 'consolidado',
            branchName: 'Reporte Consolidado Mensual',
            isConsolidated: true,
            totalIncome: totalIncomeMonth,
            totalExpense: totalExpenseMonth,
            COGS: COGS_consolidado,
            expenseDetails: [], 
            rawExpenses: branchEntries.reduce((acc, b) => [...acc, ...b.rawExpenses], []),
            budgets: monthlyBudget 
        });

        return branchEntries;
    }).flat().sort((a, b) => b.month.localeCompare(a.month));
};

export default function Reports({ data }) {
    const [activeTab, setActiveTab] = useState('Resultados');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState([]);

    const aggregatedData = useMemo(() => aggregateData(data), [data]);
    
    const availableMonths = useMemo(() => {
        const months = [...new Set(aggregatedData.map(d => d.month))];
        return months.sort((a, b) => b.localeCompare(a));
    }, [aggregatedData]);
    
    const availableBranches = useMemo(() => {
        const branches = [...new Set(aggregatedData.map(d => d.branchId))].filter(id => id !== 'consolidado'); 
        return branches.map(id => ({ id, name: branchName(id) }));
    }, [aggregatedData]);

    const filteredReport = useMemo(() => {
        return aggregatedData.filter(d => {
            const monthMatch = selectedMonth ? d.month === selectedMonth : true;
            let branchMatch = selectedBranch ? d.branchId === selectedBranch : true;
            return monthMatch && branchMatch;
        });
    }, [aggregatedData, selectedMonth, selectedBranch]);

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCOGS = 0;
    let totalGrossProfit = 0;
    let totalNetProfit = 0;
    let currentBudgets = {};
    let filteredRawExpenses = [];
    let finalExpenseRows = [];

    if (filteredReport.length > 0) {
        const d = selectedBranch ? filteredReport[0] : filteredReport.find(x => x.branchId === 'consolidado');
        if (d) {
            totalIncome = d.totalIncome;
            totalExpenses = d.totalExpense;
            totalCOGS = d.COGS;
            currentBudgets = d.budgets || {};
            filteredRawExpenses = d.rawExpenses;

            const allCategories = new Set([
                ...Object.keys(currentBudgets), 
                ...filteredReport.filter(x => !x.isConsolidated).flatMap(x => x.expenseDetails.map(ed => ed[0]))
            ]);
            
            const expenseMap = {};
            allCategories.forEach(cat => {
                const realAmount = selectedBranch 
                    ? (filteredReport[0].expenseDetails.find(ed => ed[0] === cat)?.[1] || 0)
                    : filteredReport.filter(x => !x.isConsolidated).reduce((acc, curr) => acc + (curr.expenseDetails.find(ed => ed[0] === cat)?.[1] || 0), 0);
                
                expenseMap[cat] = realAmount;
            });

            finalExpenseRows = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]);
        }
        totalGrossProfit = totalIncome - totalCOGS;
        totalNetProfit = totalGrossProfit - totalExpenses;
    }

    const toggleCategory = useCallback((cat) => {
        setExpandedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedCategories([]);
    }, []);

    const totalBudgetLimit = useMemo(() => {
        return Object.values(currentBudgets).reduce((acc, val) => acc + val, 0);
    }, [currentBudgets]);

    const totalExecution = totalBudgetLimit > 0 ? (totalExpenses / totalBudgetLimit) * 100 : 0;

    const tabsConfig = {
        'Resultados': { icon: 'chart', label: 'Estado de Resultados' },
        'Balance': { icon: 'scale', label: 'Balance General' },
        'Dashboard': { icon: 'dashboard', label: 'Dashboard' }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            {/* CSS Animaciones */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <FadeIn className="mb-8">
                    <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                        Reportes <span className="text-blue-600">Financieros</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Análisis detallado de resultados, balance y métricas</p>
                </FadeIn>

                {/* NAVEGACIÓN TABS */}
                <FadeIn delay={100} className="mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(tabsConfig).map(([tab, config]) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                                        activeTab === tab 
                                            ? 'bg-slate-800 text-white shadow-lg' 
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon path={Icons[config.icon]} className="w-4 h-4" />
                                    {config.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </FadeIn>

                {/* CONTENIDO */}
                <div className="relative">
                    {activeTab === 'Balance' && (
                        <FadeIn>
                            <BalanceSheet data={data} />
                        </FadeIn>
                    )}
                    
                    {activeTab === 'Dashboard' && (
                        <FadeIn>
                            <DashboardGeneral />
                        </FadeIn>
                    )}

                    {activeTab === 'Resultados' && (
                        <div className="space-y-6">
                            {/* FILTROS */}
                            <FadeIn delay={200}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Periodo de Análisis"
                                        icon="calendar"
                                        value={selectedMonth || ''}
                                        onChange={(e) => {
                                            setSelectedMonth(e.target.value);
                                            setExpandedCategories([]);
                                        }}
                                        options={availableMonths.map(month => (
                                            <option key={month} value={month}>{month}</option>
                                        ))}
                                    />
                                    <Select
                                        label="Unidad de Negocio"
                                        icon="building"
                                        value={selectedBranch || ''}
                                        onChange={(e) => {
                                            setSelectedBranch(e.target.value || null);
                                            setExpandedCategories([]);
                                        }}
                                        options={
                                            <>
                                                <option value="">Consolidado Global</option>
                                                {availableBranches.map(branch => (
                                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                                ))}
                                            </>
                                        }
                                    />
                                </div>
                            </FadeIn>

                            {/* STATS CARDS - COLORES CORPORATIVOS */}
                            <FadeIn delay={300}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard 
                                        title="Ingresos Totales" 
                                        value={fmt(totalIncome)}
                                        icon="trendingUp"
                                        variant="primary"
                                        trend={totalIncome > 0 ? "100" : "0"}
                                    />
                                    <StatCard 
                                        title="Costo de Venta" 
                                        value={fmt(totalCOGS)}
                                        subtitle="COGS"
                                        icon="receipt"
                                        variant="warning"
                                    />
                                    <StatCard 
                                        title="Utilidad Bruta" 
                                        value={fmt(totalGrossProfit)}
                                        icon="dollar"
                                        variant={totalGrossProfit >= 0 ? 'success' : 'danger'}
                                        trend={totalIncome > 0 ? ((totalGrossProfit / totalIncome) * 100).toFixed(1) : 0}
                                    />
                                    <StatCard 
                                        title="Utilidad Neta" 
                                        value={fmt(totalNetProfit)}
                                        icon="wallet"
                                        variant={totalNetProfit >= 0 ? 'dark' : 'danger'}
                                        trend={totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(1) : 0}
                                    />
                                </div>
                            </FadeIn>

                            {/* CONTENIDO PRINCIPAL */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* RESUMEN EJECUTIVO - COLORES PROFESIONALES */}
                                <FadeIn delay={400} className="lg:col-span-1">
                                    <Card 
                                        title="Resumen Ejecutivo" 
                                        subtitle="Análisis de rentabilidad mensual"
                                        icon="chart"
                                        gradient={true}
                                    >
                                        <div className="space-y-4">
                                            {/* INGRESOS - AHORA VISIBLE CON FONDO CLARO */}
                                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                        <Icon path={Icons.trendingUp} className="w-5 h-5 text-blue-700" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-bold uppercase">Ingresos</div>
                                                        <div className="text-lg font-black text-slate-800">{fmt(totalIncome)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* COGS - TONO CORPORATIVO */}
                                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                        <Icon path={Icons.receipt} className="w-5 h-5 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-bold uppercase">Costo de Venta</div>
                                                        <div className="text-lg font-black text-slate-700">{fmt(totalCOGS)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SEPARADOR */}
                                            <div className="h-px bg-slate-700/30"></div>

                                            {/* UTILIDAD BRUTA - ÉXITO */}
                                            <div className="flex items-center justify-between p-4 bg-emerald-500 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                                        <Icon path={Icons.dollar} className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-emerald-100 font-bold uppercase">Utilidad Bruta</div>
                                                        <div className="text-xl font-black text-white">{fmt(totalGrossProfit)}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-emerald-100 font-bold">Margen</div>
                                                    <div className="text-lg font-bold text-white">
                                                        {totalIncome > 0 ? ((totalGrossProfit / totalIncome) * 100).toFixed(1) : 0}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* GASTOS - TONO NARANJA CORPORATIVO */}
                                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                                        <Icon path={Icons.trendingDown} className="w-5 h-5 text-orange-700" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-bold uppercase">Gastos Operativos</div>
                                                        <div className="text-lg font-black text-slate-700">{fmt(totalExpenses)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* UTILIDAD NETA - DESTACADA */}
                                            <div className={`flex items-center justify-between p-4 rounded-xl ${
                                                totalNetProfit >= 0 
                                                    ? 'bg-emerald-600' 
                                                    : 'bg-rose-600'
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                                        <Icon path={Icons.wallet} className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-white/80 font-bold uppercase">Utilidad Neta</div>
                                                        <div className="text-2xl font-black text-white">{fmt(totalNetProfit)}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-white/80 font-bold">% del Ingreso</div>
                                                    <div className="text-xl font-bold text-white">
                                                        {totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(1) : 0}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </FadeIn>

                                {/* DESGLOSE DE GASTOS */}
                                <FadeIn delay={500} className="lg:col-span-2">
                                    <Card 
                                        title="Desglose Operativo" 
                                        subtitle="Análisis detallado de gastos vs presupuesto"
                                        icon="receipt"
                                        right={
                                            expandedCategories.length > 0 && (
                                                <button 
                                                    onClick={collapseAll}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <Icon path={Icons.x} className="w-3 h-3" />
                                                    Colapsar todo
                                                </button>
                                            )
                                        }
                                    >
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-left border-b-2 border-slate-200">
                                                        <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</th>
                                                        <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Real</th>
                                                        <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Presupuesto</th>
                                                        <th className="pb-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Ejecución</th>
                                                        <th className="pb-4 w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {finalExpenseRows.map(([category, amount]) => {
                                                        const budget = currentBudgets[category] || 0;
                                                        const execPercent = budget > 0 ? (amount / budget) * 100 : 0;
                                                        const isExpanded = expandedCategories.includes(category);
                                                        
                                                        return (
                                                            <React.Fragment key={category}>
                                                                <tr 
                                                                    className={`group transition-colors ${amount > 0 ? 'cursor-pointer hover:bg-slate-50' : 'bg-slate-50/50'}`}
                                                                    onClick={() => amount > 0 && toggleCategory(category)}
                                                                >
                                                                    <td className="py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                                                                                amount > 0 
                                                                                    ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-200' 
                                                                                    : 'bg-slate-100 text-slate-400'
                                                                            }`}>
                                                                                <Icon 
                                                                                    path={isExpanded ? Icons.chevronDown : Icons.chevronRight} 
                                                                                    className="w-4 h-4" 
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-bold text-slate-700 text-sm uppercase">{category}</div>
                                                                                {amount === 0 && (
                                                                                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-500 font-medium">
                                                                                        Sin movimientos
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 text-right">
                                                                        <div className="font-bold text-slate-800">{fmt(amount)}</div>
                                                                    </td>
                                                                    <td className="py-4 text-right">
                                                                        <div className="text-slate-500 font-medium">
                                                                            {budget > 0 ? fmt(budget) : '—'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 text-right">
                                                                        {budget > 0 ? (
                                                                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                                                                                execPercent > 100 
                                                                                    ? 'bg-rose-100 text-rose-700' 
                                                                                    : execPercent > 80 
                                                                                        ? 'bg-amber-100 text-amber-700'
                                                                                        : 'bg-emerald-100 text-emerald-700'
                                                                            }`}>
                                                                                {execPercent.toFixed(1)}%
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td></td>
                                                                </tr>
                                                                {isExpanded && amount > 0 && (
                                                                    <tr>
                                                                        <td colSpan="5" className="pb-4">
                                                                            <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-blue-500 ml-9 space-y-2 animate-fade-in">
                                                                                <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                                                                    <Icon path={Icons.receipt} className="w-4 h-4" />
                                                                                    Detalle de transacciones
                                                                                </div>
                                                                                {filteredRawExpenses
                                                                                    .filter(item => item.category === category)
                                                                                    .map((item, idx) => (
                                                                                        <div 
                                                                                            key={idx} 
                                                                                            className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-slate-200"
                                                                                        >
                                                                                            <div className="flex flex-col">
                                                                                                <span className="text-xs text-slate-400 font-bold">{item.dateStr}</span>
                                                                                                <span className="text-slate-700 font-medium">{item.description}</span>
                                                                                            </div>
                                                                                            <span className="font-black text-slate-800">{fmt(peso(item.amount))}</span>
                                                                                        </div>
                                                                                    ))}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t-2 border-slate-800 bg-slate-100">
                                                        <td className="py-4 pl-4">
                                                            <div className="font-bold text-slate-800 uppercase text-sm">Total Operativo</div>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <div className="font-black text-slate-800">{fmt(totalExpenses)}</div>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <div className="font-bold text-slate-600">{fmt(totalBudgetLimit)}</div>
                                                        </td>
                                                        <td className="py-4 text-right pr-4">
                                                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-black ${
                                                                totalExecution > 100 
                                                                    ? 'bg-rose-600 text-white' 
                                                                    : totalExecution > 90
                                                                        ? 'bg-amber-500 text-white'
                                                                        : 'bg-emerald-600 text-white'
                                                            }`}>
                                                                {totalExecution.toFixed(1)}%
                                                            </div>
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        {/* Barra de progreso */}
                                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold uppercase text-slate-500">Ejecución del Presupuesto Total</span>
                                                <span className={`text-sm font-black ${
                                                    totalExecution > 100 ? 'text-rose-600' : 'text-emerald-600'
                                                }`}>
                                                    {totalExecution.toFixed(1)}% utilizado
                                                </span>
                                            </div>
                                            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${
                                                        totalExecution > 100 
                                                            ? 'bg-rose-500' 
                                                            : totalExecution > 90 
                                                                ? 'bg-amber-500' 
                                                                : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${Math.min(totalExecution, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </Card>
                                </FadeIn>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}