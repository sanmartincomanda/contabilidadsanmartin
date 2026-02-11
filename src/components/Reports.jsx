// src/components/Reports.jsx
import React, { useMemo, useState } from 'react';
import { BRANCHES, fmt, peso, branchName } from '../constants'; 
import BalanceSheet from './BalanceSheet';
import DashboardGeneral from './DashboardGeneral';

// Componente Card Corporativo
export const Card = ({ title, children, className = '', extraHeader, subtitle }) => (
    <div className={`rounded-xl shadow-md border border-slate-200 bg-white overflow-hidden ${className}`}>
        {(title || extraHeader) && (
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
                <div>
                    <h3 className="text-white font-bold tracking-wide uppercase text-sm">{title}</h3>
                    {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
                </div>
                {extraHeader}
            </div>
        )}
        <div className="p-6">
            {children}
        </div>
    </div>
);

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

            // Lógica para Categorías Fantasma: Unir Presupuesto + Real
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

    const toggleCategory = (cat) => {
        setExpandedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const totalBudgetLimit = useMemo(() => {
        return Object.values(currentBudgets).reduce((acc, val) => acc + val, 0);
    }, [currentBudgets]);

    const totalExecution = totalBudgetLimit > 0 ? (totalExpenses / totalBudgetLimit) * 100 : 0;

    return (
        <div className="space-y-8 bg-slate-50 min-h-screen p-4 md:p-8">
            {/* NAVEGACIÓN MODERNA */}
            <div className="flex justify-center">
                <div className="inline-flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    {['Resultados', 'Balance', 'Dashboard'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 px-8 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                ? 'bg-slate-800 text-white shadow-md' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab === 'Resultados' ? 'E. Resultados' : tab === 'Balance' ? 'B. General' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'Balance' && <BalanceSheet data={data} />}
            {activeTab === 'Dashboard' && <DashboardGeneral />}

            {activeTab === 'Resultados' && (
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* FILTROS DE REPORTE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                            <span className="text-slate-500 text-xs font-bold uppercase">Periodo de Análisis</span>
                            <select 
                                value={selectedMonth || ''} 
                                onChange={(e) => {setSelectedMonth(e.target.value); setExpandedCategories([]);}}
                                className="bg-slate-50 border-none text-slate-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-slate-800 p-2"
                            >
                                {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
                            </select>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                            <span className="text-slate-500 text-xs font-bold uppercase">Unidad de Negocio</span>
                            <select 
                                value={selectedBranch || ''} 
                                onChange={(e) => {setSelectedBranch(e.target.value); setExpandedCategories([]);}}
                                className="bg-slate-50 border-none text-slate-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-slate-800 p-2"
                            >
                                <option value="">Consolidado Global</option>
                                {availableBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* ESTADO DE RESULTADOS IZQUIERDA */}
                        <div className="lg:col-span-1">
                            <Card title="Resumen Ejecutivo" subtitle="Análisis de rentabilidad mensual">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm italic">
                                        <span className="text-slate-500 uppercase font-medium text-[10px] tracking-tighter">Ingresos Totales</span>
                                        <span className="font-bold text-slate-800">{fmt(totalIncome)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm italic">
                                        <span className="text-slate-500 uppercase font-medium text-[10px] tracking-tighter">Costo de Venta (COGS)</span>
                                        <span className="font-bold text-rose-600">({fmt(totalCOGS)})</span>
                                    </div>
                                    <div className="h-px bg-slate-100 my-2" />
                                    <div className="flex justify-between items-center italic">
                                        <span className="text-slate-900 font-black uppercase text-xs">Utilidad Bruta</span>
                                        <span className="text-lg font-black text-slate-900">{fmt(totalGrossProfit)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm italic">
                                        <span className="text-slate-500 uppercase font-medium text-[10px] tracking-tighter">Gastos Operativos</span>
                                        <span className="font-bold text-rose-600">({fmt(totalExpenses)})</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full my-4" />
                                    <div className="flex justify-between items-center p-4 bg-slate-900 rounded-xl shadow-inner mt-4">
                                        <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Utilidad Neta</span>
                                        <span className={`text-2xl font-black ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {fmt(totalNetProfit)}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* DETALLE DE GASTOS DERECHA */}
                        <div className="lg:col-span-2">
                            <Card 
                                title="Desglose Operativo" 
                                subtitle="Análisis detallado de gastos vs presupuesto"
                                extraHeader={
                                    expandedCategories.length > 0 && (
                                        <button 
                                            onClick={() => setExpandedCategories([])} 
                                            className="text-[10px] bg-slate-700 text-white px-3 py-1 rounded-full uppercase font-bold"
                                        >
                                            Colapsar
                                        </button>
                                    )
                                }
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-slate-400 border-b border-slate-100 italic">
                                                <th className="pb-4 text-[10px] uppercase tracking-widest font-black">Categoría</th>
                                                <th className="pb-4 text-[10px] uppercase tracking-widest font-black text-right">Real</th>
                                                <th className="pb-4 text-[10px] uppercase tracking-widest font-black text-right">Presupuesto</th>
                                                <th className="pb-4 text-[10px] uppercase tracking-widest font-black text-right">Ejecución</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {finalExpenseRows.map(([category, amount]) => {
                                                const budget = currentBudgets[category] || 0;
                                                const execPercent = budget > 0 ? (amount / budget) * 100 : 0;
                                                const isExpanded = expandedCategories.includes(category);
                                                
                                                return (
                                                    <React.Fragment key={category}>
                                                        <tr 
                                                            className={`hover:bg-slate-50 transition-colors ${amount > 0 ? 'cursor-pointer' : 'opacity-60 bg-slate-50/50'} group`}
                                                            onClick={() => amount > 0 && toggleCategory(category)}
                                                        >
                                                            <td className="py-4 text-xs font-bold text-slate-700 flex items-center uppercase">
                                                                {amount > 0 ? (
                                                                    <span className={`mr-3 text-[8px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                                ) : (
                                                                    <span className="mr-3 text-[12px] text-slate-300">○</span>
                                                                )}
                                                                {category} {amount === 0 && <span className="ml-2 text-[9px] bg-slate-200 px-1 rounded text-slate-500 font-normal italic">Sin Gasto</span>}
                                                            </td>
                                                            <td className="py-4 text-sm font-black text-slate-900 text-right">{fmt(amount)}</td>
                                                            <td className="py-4 text-sm text-slate-400 text-right italic">{budget > 0 ? fmt(budget) : '---'}</td>
                                                            <td className={`py-4 text-[10px] font-black text-right ${execPercent > 100 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                {budget > 0 ? `${execPercent.toFixed(1)}%` : '---'}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && amount > 0 && (
                                                            <tr>
                                                                <td colSpan="4" className="pb-4">
                                                                    <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-slate-800 space-y-2 mx-2 shadow-inner">
                                                                        {filteredRawExpenses
                                                                            .filter(item => item.category === category)
                                                                            .map((item, idx) => (
                                                                                <div key={idx} className="flex justify-between items-center text-[10px] border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-slate-400 font-bold">{item.dateStr}</span>
                                                                                        <span className="text-slate-800 uppercase font-medium italic">{item.description}</span>
                                                                                    </div>
                                                                                    <span className="font-black text-slate-900">{fmt(peso(item.amount))}</span>
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
                                            <tr className="border-t-2 border-slate-900 bg-slate-100">
                                                <td className="py-6 text-xs font-black text-slate-900 uppercase italic pl-2">Total Operativo</td>
                                                <td className="py-6 text-sm font-black text-slate-900 text-right">{fmt(totalExpenses)}</td>
                                                <td className="py-6 text-sm font-black text-slate-600 text-right italic">{fmt(totalBudgetLimit)}</td>
                                                <td className={`py-6 text-sm font-black text-right pr-2 ${totalExecution > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {totalExecution.toFixed(1)}%
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}