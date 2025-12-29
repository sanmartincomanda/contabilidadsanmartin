// src/components/Reports.jsx

import React, { useMemo, useState } from 'react';
// Asumimos que estas funciones y constantes están correctamente definidas en '../constants'
import { BRANCHES, fmt, peso, branchName } from '../constants'; 

const Card = ({ title, children, className = '' }) => (
    <div className={`rounded-2xl shadow-sm border border-neutral-200 bg-white p-4 ${className}`}>
        <div className="text-lg font-semibold text-neutral-700 mb-3">{title}</div>
        {children}
    </div>
);

// Función de Agregación: Transforma los datos crudos en la estructura del Estado de Resultados
const aggregateData = (data) => {
    const results = {}; // Key: YYYY-MM
    // MODIFICACIÓN: Extraemos también 'presupuestos' del objeto data
    const { ingresos = [], gastos = [], inventarios = [], compras = [], presupuestos = [] } = data;

    // --- UTILITY: Convierte Timestamp a Date String (YYYY-MM-DD) ---
    const getDateString = (firestoreDate) => {
        if (typeof firestoreDate === 'string') {
            return firestoreDate;
        }
        if (firestoreDate && firestoreDate.toDate) {
            return firestoreDate.toDate().toISOString().substring(0, 10);
        }
        return new Date().toISOString().substring(0, 10);
    };

    // 1. Agrupar Compras por Mes
    const purchasesByMonth = compras.reduce((acc, c) => {
        acc[c.month] = (acc[c.month] || 0) + peso(c.amount); 
        return acc;
    }, {});

    // 1.1 Agrupar Presupuestos por Mes (Nueva lógica)
    const budgetsByMonth = presupuestos.reduce((acc, p) => {
        acc[p.month] = acc[p.month] || {};
        acc[p.month][p.category] = (acc[p.month][p.category] || 0) + peso(p.amount);
        return acc;
    }, {});
    
    // 2. Agrupar Ingresos y Gastos por Mes y Sucursal
    [...ingresos, ...gastos].forEach(item => {
        const dateString = getDateString(item.date); 
        const month = dateString.substring(0, 7); 
        const branchId = item.branch;
        
        results[month] = results[month] || {};
        results[month][branchId] = results[month][branchId] || { 
            totalIncome: 0, 
            totalExpense: 0, 
            expenseDetails: {} 
        };

        const branchData = results[month][branchId];

        if (item.category) { // Es un Gasto
            branchData.totalExpense += peso(item.amount);
            branchData.expenseDetails[item.category] = (branchData.expenseDetails[item.category] || 0) + peso(item.amount);
        } else { // Es un Ingreso
            branchData.totalIncome += peso(item.amount);
        }
    });

    // 3. Integrar Inventarios
    inventarios.forEach(item => {
        const month = item.month;
        const branchId = item.branch;
        if (!branchId || !month) return; 

        results[month] = results[month] || {};
        results[month][branchId] = results[month][branchId] || {
            totalIncome: 0, totalExpense: 0, expenseDetails: {} 
        };
        const branchData = results[month][branchId];
        
        if (item.type === 'inicial') branchData.initialInventory = peso(item.amount);
        else if (item.type === 'final') branchData.finalInventory = peso(item.amount);
    });

    // 4. Transformar a array final y calcular costos
    return Object.entries(results).map(([month, branchesData]) => {
        const branchEntriesArray = Object.values(branchesData);
        const totalIncomeMonth = branchEntriesArray.reduce((sum, data) => sum + data.totalIncome, 0);
        const totalPurchasesGlobal = purchasesByMonth[month] || 0; 
        const monthlyBudget = budgetsByMonth[month] || {}; // Presupuesto de este mes
        
        let totalInitialInv = 0;
        let totalFinalInv = 0;

        const branchEntries = Object.entries(branchesData).map(([branchId, data]) => {
            const salesPercentage = totalIncomeMonth > 0 ? (data.totalIncome / totalIncomeMonth) : 0;
            const distributedPurchases = totalPurchasesGlobal * salesPercentage;
            const initialInv = data.initialInventory || 0;
            const finalInv = data.finalInventory || 0;
            
            totalInitialInv += initialInv;
            totalFinalInv += finalInv;

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
                budgets: monthlyBudget // Adjuntamos presupuesto al objeto
            };
        });
        
        const COGS_consolidado = totalInitialInv + totalPurchasesGlobal - totalFinalInv;
        const totalExpenseMonth = branchEntries.reduce((sum, b) => sum + b.totalExpense, 0);

        branchEntries.push({
            month,
            branchId: 'consolidado',
            branchName: 'Reporte Consolidado Mensual',
            isConsolidated: true,
            totalIncome: totalIncomeMonth,
            totalExpense: totalExpenseMonth,
            initialInventory: totalInitialInv,
            finalInventory: totalFinalInv,
            totalPurchases: totalPurchasesGlobal, 
            COGS: COGS_consolidado,
            grossProfit: totalIncomeMonth - COGS_consolidado,
            netProfit: (totalIncomeMonth - COGS_consolidado) - totalExpenseMonth,
            expenseDetails: {}, 
            budgets: monthlyBudget 
        });

        return branchEntries;
    }).flat().sort((a, b) => b.month.localeCompare(a.month));
};

export default function Reports({ data }) {
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);

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

    // ** LOGICA DE CÁLCULO DE TOTALES (Tu estructura intacta) **
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCOGS = 0;
    let totalGrossProfit = 0;
    let totalNetProfit = 0;
    let expenseDetails = []; 
    let currentBudgets = {}; // Para comparar en la tabla

    if (filteredReport.length > 0) {
        if (selectedBranch) {
            const d = filteredReport[0];
            totalIncome = d.totalIncome;
            totalExpenses = d.totalExpense;
            totalCOGS = d.COGS;
            expenseDetails = d.expenseDetails; 
            currentBudgets = d.budgets || {};
        } else {
            const consolidated = filteredReport.find(d => d.branchId === 'consolidado' && (selectedMonth ? d.month === selectedMonth : true));
            if (consolidated) {
                totalIncome = consolidated.totalIncome;
                totalExpenses = consolidated.totalExpense;
                totalCOGS = consolidated.COGS;
                currentBudgets = consolidated.budgets || {};
            } else {
                const nonConsolidated = filteredReport.filter(d => d.branchId !== 'consolidado');
                totalIncome = nonConsolidated.reduce((acc, d) => acc + d.totalIncome, 0);
                totalExpenses = nonConsolidated.reduce((acc, d) => acc + d.totalExpense, 0);
                totalCOGS = nonConsolidated.reduce((acc, d) => acc + d.COGS, 0);
                // Si no hay mes seleccionado, no mostramos presupuesto (o sumamos todos, pero es confuso)
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

    return (
        <Card title="Reporte de Estado de Resultados">
            {/* Controles de Filtro */}
            <div className="flex space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Mes:</label>
                    <select value={selectedMonth || ''} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 border rounded-lg text-sm">
                        <option value="">Todos</option>
                        {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Sucursal:</label>
                    <select value={selectedBranch || ''} onChange={(e) => setSelectedBranch(e.target.value)} className="p-2 border rounded-lg text-sm">
                        <option value="">Todas (Consolidado)</option>
                        {availableBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                </div>
            </div>

            {filteredReport.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tarjeta de Resumen */}
                    <Card title="Resultado Operacional" className="md:col-span-1 border-4 border-green-200 bg-neutral-50">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between border-b pb-1"><span>(+) Ingresos Totales:</span><span className="font-semibold text-green-600">{fmt(totalIncome)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(-) Costo de Venta:</span><span className="font-semibold text-red-600">{fmt(totalCOGS)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(=) Utilidad Bruta:</span><span className="font-bold text-lg">{fmt(totalGrossProfit)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(-) Gastos Operacionales:</span><span className="font-semibold text-red-600">{fmt(totalExpenses)}</span></div>
                            <div className="flex justify-between pt-1"><span>(=) Utilidad Neta:</span><span className={`font-bold text-xl ${totalNetProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(totalNetProfit)}</span></div>
                        </div>
                    </Card>

                    {/* Detalle de Gastos con COMPARACIÓN */}
                    <Card title="Control de Presupuesto" className="md:col-span-2">
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
                                    return (
                                        <tr key={category} className="border-t border-neutral-100 hover:bg-neutral-50">
                                            <td className="py-2 pr-3 font-medium">{category}</td>
                                            <td className="py-2 pr-3 text-right font-semibold">{fmt(amount)}</td>
                                            <td className="py-2 pr-3 text-right text-neutral-500 italic">{budget > 0 ? fmt(budget) : '---'}</td>
                                            <td className={`py-2 pr-3 text-right font-bold ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {budget > 0 ? (diff < 0 ? `▲ ${fmt(Math.abs(diff))}` : `▼ ${fmt(diff)}`) : '---'}
                                            </td>
                                        </tr>
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