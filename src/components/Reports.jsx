import React, { useMemo, useState } from 'react';
import { BRANCHES, fmt, peso, branchName } from '../constants'; 

const Card = ({ title, children, className = '', extraHeader }) => (
    <div className={`rounded-2xl shadow-sm border border-neutral-200 bg-white p-4 ${className}`}>
        <div className="flex justify-between items-center mb-3">
            <div className="text-lg font-semibold text-neutral-700">{title}</div>
            {extraHeader}
        </div>
        {children}
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
            // AGREGADO: Guardamos los items originales aquí
            rawExpenses: [] 
        };

        const branchData = results[month][branchId];

        if (item.category) { 
            branchData.totalExpense += peso(item.amount);
            branchData.expenseDetails[item.category] = (branchData.expenseDetails[item.category] || 0) + peso(item.amount);
            // Guardamos el item con su fecha formateada
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

            const expenseDetails = data.expenseDetails 
                ? Object.entries(data.expenseDetails).sort((a, b) => b[1] - a[1])
                : [];

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
                expenseDetails: expenseDetails,
                rawExpenses: data.rawExpenses, // Pasamos los items
                budgets: monthlyBudget 
            };
        });
        
        const COGS_consolidado = branchEntries.reduce((sum, b) => sum + b.initialInventory, 0) + totalPurchasesGlobal - branchEntries.reduce((sum, b) => sum + b.finalInventory, 0);
        const totalExpenseMonth = branchEntries.reduce((sum, b) => sum + b.totalExpense, 0);

        branchEntries.push({
            month,
            branchId: 'consolidado',
            branchName: 'Reporte Consolidado Mensual',
            isConsolidated: true,
            totalIncome: totalIncomeMonth,
            totalExpense: totalExpenseMonth,
            expenseDetails: {}, 
            rawExpenses: branchEntries.reduce((acc, b) => [...acc, ...b.rawExpenses], []), // Consolidamos items
            budgets: monthlyBudget 
        });

        return branchEntries;
    }).flat().sort((a, b) => b.month.localeCompare(a.month));
};

export default function Reports({ data }) {
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    // NUEVO: Estado para controlar qué categorías están expandidas
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
    let expenseDetails = []; 
    let currentBudgets = {};
    let filteredRawExpenses = []; // Para el desglose

    if (filteredReport.length > 0) {
        if (selectedBranch) {
            const d = filteredReport[0];
            totalIncome = d.totalIncome;
            totalExpenses = d.totalExpense;
            totalCOGS = d.COGS;
            expenseDetails = d.expenseDetails; 
            currentBudgets = d.budgets || {};
            filteredRawExpenses = d.rawExpenses;
        } else {
            const consolidated = filteredReport.find(d => d.branchId === 'consolidado' && (selectedMonth ? d.month === selectedMonth : true));
            if (consolidated) {
                totalIncome = consolidated.totalIncome;
                totalExpenses = consolidated.totalExpense;
                totalCOGS = consolidated.COGS;
                currentBudgets = consolidated.budgets || {};
                filteredRawExpenses = consolidated.rawExpenses;
            } else {
                const nonConsolidated = filteredReport.filter(d => d.branchId !== 'consolidado');
                totalIncome = nonConsolidated.reduce((acc, d) => acc + d.totalIncome, 0);
                totalExpenses = nonConsolidated.reduce((acc, d) => acc + d.totalExpense, 0);
                totalCOGS = nonConsolidated.reduce((acc, d) => acc + d.COGS, 0);
                filteredRawExpenses = nonConsolidated.reduce((acc, d) => [...acc, ...d.rawExpenses], []);
            }
            
            const expenseDetailsMap = filteredReport
                .filter(d => d.branchId !== 'consolidado') 
                .reduce((acc, d) => {
                    d.expenseDetails.forEach(([category, amount]) => {
                        acc[category] = (acc[category] || 0) + amount;
                    });
                    return acc;
                }, {});
            expenseDetails = Object.entries(expenseDetailsMap).sort((a, b) => b[1] - a[1]);
        }
        totalGrossProfit = totalIncome - totalCOGS;
        totalNetProfit = totalGrossProfit - totalExpenses;
    }

    // Funciones de control de expansión
    const toggleCategory = (cat) => {
        setExpandedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    return (
        <Card title="Reporte de Estado de Resultados">
            <div className="flex space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Mes:</label>
                    <select value={selectedMonth || ''} onChange={(e) => {setSelectedMonth(e.target.value); setExpandedCategories([]);}} className="p-2 border rounded-lg text-sm">
                        <option value="">Todos</option>
                        {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Sucursal:</label>
                    <select value={selectedBranch || ''} onChange={(e) => {setSelectedBranch(e.target.value); setExpandedCategories([]);}} className="p-2 border rounded-lg text-sm">
                        <option value="">Todas (Consolidado)</option>
                        {availableBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                </div>
            </div>

            {filteredReport.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Resultado Operacional" className="md:col-span-1 border-4 border-green-200 bg-neutral-50">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between border-b pb-1"><span>(+) Ingresos Totales:</span><span className="font-semibold text-green-600">{fmt(totalIncome)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(-) Costo de Venta:</span><span className="font-semibold text-red-600">{fmt(totalCOGS)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(=) Utilidad Bruta:</span><span className="font-bold text-lg">{fmt(totalGrossProfit)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(-) Gastos Operacionales:</span><span className="font-semibold text-red-600">{fmt(totalExpenses)}</span></div>
                            <div className="flex justify-between pt-1"><span>(=) Utilidad Neta:</span><span className={`font-bold text-xl ${totalNetProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(totalNetProfit)}</span></div>
                        </div>
                    </Card>

                    <Card 
                        title="Control de Presupuesto" 
                        className="md:col-span-2"
                        extraHeader={
                            expandedCategories.length > 0 && (
                                <button onClick={() => setExpandedCategories([])} className="text-xs text-blue-600 hover:underline font-normal">
                                    Esconder todos
                                </button>
                            )
                        }
                    >
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-neutral-500 sticky top-0 bg-white border-b">
                                    <th className="py-2 pr-3">Categoría</th>
                                    <th className="py-2 pr-3 text-right">Real</th>
                                    <th className="py-2 pr-3 text-right">Presupuesto</th>
                                    <th className="py-2 pr-3 text-right">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseDetails.map(([category, amount]) => {
                                    const budget = currentBudgets[category] || 0;
                                    const diff = budget - amount;
                                    const isExpanded = expandedCategories.includes(category);
                                    
                                    return (
                                        <React.Fragment key={category}>
                                            <tr 
                                                className="border-t border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                                                onClick={() => toggleCategory(category)}
                                            >
                                                <td className="py-2 pr-3 font-medium">
                                                    <span className="mr-2 inline-block w-2">{isExpanded ? '▾' : '▸'}</span>
                                                    {category}
                                                </td>
                                                <td className="py-2 pr-3 text-right font-semibold">{fmt(amount)}</td>
                                                <td className="py-2 pr-3 text-right text-neutral-500 italic">{budget > 0 ? fmt(budget) : '---'}</td>
                                                <td className={`py-2 pr-3 text-right font-bold ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {budget > 0 ? (diff < 0 ? `▲ ${fmt(Math.abs(diff))}` : `▼ ${fmt(diff)}`) : '---'}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="4" className="bg-neutral-50 p-0">
                                                        <div className="px-6 py-2 border-l-4 border-blue-200 ml-2">
                                                            {filteredRawExpenses
                                                                .filter(item => item.category === category)
                                                                .map((item, idx) => (
                                                                    <div key={idx} className="flex justify-between py-1 border-b border-neutral-200 last:border-0 text-xs">
                                                                        <span className="text-neutral-500">{item.dateStr}</span>
                                                                        <span className="flex-1 px-4">{item.description}</span>
                                                                        <span className="font-medium">{fmt(peso(item.amount))}</span>
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
                                <tr className="border-t-2 font-bold bg-neutral-50">
                                    <td className="py-2 pr-3 uppercase">Total Gastos</td>
                                    <td className="py-2 pr-3 text-right">{fmt(totalExpenses)}</td>
                                    <td className="py-2 pr-3 text-right">{fmt(Object.values(currentBudgets).reduce((a,b)=>a+b, 0))}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </Card>
                </div>
            )}
            
            {filteredReport.length === 0 && (
                <p className="p-4 text-center text-neutral-500 border rounded-lg bg-neutral-50">
                    No hay datos que coincidan con los filtros seleccionados.
                </p>
            )}
        </Card>
    );
}