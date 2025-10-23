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
    const { ingresos = [], gastos = [], inventarios = [], compras = [] } = data;

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
    // ------------------------------------------------------------------

    // 1. Agrupar Compras por Mes (Compras Totales Globales)
    const purchasesByMonth = compras.reduce((acc, c) => {
        // Usamos peso(c.amount) para asegurar consistencia
        acc[c.month] = (acc[c.month] || 0) + peso(c.amount); 
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

    // 3. Integrar Inventarios a los Resultados Mensuales
    inventarios.forEach(item => {
        const month = item.month; // Asume formato YYYY-MM
        const branchId = item.branch;
        
        // El inventario debe ir asociado a una sucursal. Si no tiene, se ignora.
        if (!branchId || !month) return; 

        results[month] = results[month] || {};
        results[month][branchId] = results[month][branchId] || {
            totalIncome: 0, 
            totalExpense: 0, 
            expenseDetails: {} 
        };
        const branchData = results[month][branchId];
        
        // **IMPORTANTE:** El tipo debe ser 'inicial' o 'final' en minúsculas.
        if (item.type === 'inicial') {
            branchData.initialInventory = peso(item.amount);
        } else if (item.type === 'final') {
            branchData.finalInventory = peso(item.amount);
        }
    });

    // 4. Transformar a array final y calcular costos (LÓGICA CORREGIDA)
    return Object.entries(results).map(([month, branchesData]) => {
        
        const branchEntriesArray = Object.values(branchesData);

        // A. CÁLCULO BASE MENSUAL GLOBAL
        const totalIncomeMonth = branchEntriesArray.reduce((sum, data) => sum + data.totalIncome, 0);
        const totalPurchasesGlobal = purchasesByMonth[month] || 0; 
        
        let totalInitialInv = 0;
        let totalFinalInv = 0;

        // B. DISTRIBUCIÓN POR SUCURSAL y CÁLCULO DE COGS INDIVIDUAL
        const branchEntries = Object.entries(branchesData).map(([branchId, data]) => {
            
            // 1. Distribución de Compras por porcentaje de Ingreso (Venta)
            const salesPercentage = totalIncomeMonth > 0 ? (data.totalIncome / totalIncomeMonth) : 0;
            const distributedPurchases = totalPurchasesGlobal * salesPercentage;

            // 2. Obtener Inventarios y Acumular para el Consolidado
            const initialInv = data.initialInventory || 0;
            const finalInv = data.finalInventory || 0;
            
            totalInitialInv += initialInv;
            totalFinalInv += finalInv;

            // 3. Cálculo del Costo de Venta (COGS) por Sucursal
            // COGS = Inv. Inicial + Compras Distribuidas - Inv. Final
            const COGS = initialInv + distributedPurchases - finalInv;
            
            // 4. Resultado Operacional
            const grossProfit = data.totalIncome - COGS;
            const netProfit = grossProfit - data.totalExpense;

            // 5. Ordenar detalles de gastos
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
                totalPurchases: distributedPurchases, // Compras distribuidas
                COGS: COGS,
                grossProfit: grossProfit,
                netProfit: netProfit,
                expenseDetails: expenseDetails,
            };
        });
        
        // C. CÁLCULO CONSOLIDADO DEL MES
        // Se calcula el COGS global para el reporte Consolidado
        const COGS_consolidado = totalInitialInv + totalPurchasesGlobal - totalFinalInv;
        const grossProfit_consolidado = totalIncomeMonth - COGS_consolidado;
        const totalExpenseMonth = branchEntries.reduce((sum, b) => sum + b.totalExpense, 0);
        const netProfit_consolidado = grossProfit_consolidado - totalExpenseMonth;

        // Agregar la entrada consolidada (esencial para el filtro "Todas")
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
            grossProfit: grossProfit_consolidado,
            netProfit: netProfit_consolidado,
            expenseDetails: {}, 
        });

        return branchEntries;
    }).flat().sort((a, b) => b.month.localeCompare(a.month));
};


// -------------------------------------------------------------------------
// --- Componente Principal: Reports ---
// -------------------------------------------------------------------------

export default function Reports({ data, categories }) {
    // Definición de estados de filtro (CLAVE para evitar ReferenceError)
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);

    const aggregatedData = useMemo(() => aggregateData(data), [data]);
    
    // Lista de meses únicos para el filtro
    const availableMonths = useMemo(() => {
        const months = [...new Set(aggregatedData.map(d => d.month))];
        return months.sort((a, b) => b.localeCompare(a));
    }, [aggregatedData]);
    
    // Lista de sucursales únicas para el filtro
    const availableBranches = useMemo(() => {
        // Excluye 'consolidado' de las opciones de sucursal
        const branches = [...new Set(aggregatedData.map(d => d.branchId))].filter(id => id !== 'consolidado'); 
        return branches.map(id => ({ id, name: branchName(id) }));
    }, [aggregatedData]);

    const filteredReport = useMemo(() => {
        return aggregatedData.filter(d => {
            const monthMatch = selectedMonth ? d.month === selectedMonth : true;
            
            // Lógica de filtro:
            let branchMatch = true;
            if (selectedBranch) {
                // Si seleccionamos una sucursal, solo mostramos la data de esa sucursal
                branchMatch = d.branchId === selectedBranch;
            } else {
                // Si seleccionamos "Todas" (selectedBranch es null), mostramos todos los registros
                // para poder calcular la suma total/consolidado correctamente.
                branchMatch = true; 
            }

            return monthMatch && branchMatch;
        });
    }, [aggregatedData, selectedMonth, selectedBranch]);

    // -------------------------------------------------------------
    // ** LÓGICA DE CÁLCULO DE TOTALES FINAL Y VISUALIZACIÓN **
    // -------------------------------------------------------------
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCOGS = 0;
    let totalGrossProfit = 0;
    let totalNetProfit = 0;
    let expenseDetails = []; // Para el detalle de la tabla

    if (filteredReport.length > 0) {
        
        if (selectedBranch) {
            // Caso 1: Sucursal específica seleccionada
            const d = filteredReport[0];
            totalIncome = d.totalIncome;
            totalExpenses = d.totalExpense;
            totalCOGS = d.COGS;
            expenseDetails = d.expenseDetails; 

        } else {
            // Caso 2: "Todas" las sucursales (Consolidado)

            // Intentamos usar el registro 'consolidado' si existe un filtro de mes
            const consolidated = filteredReport.find(d => d.branchId === 'consolidado' && (selectedMonth ? d.month === selectedMonth : true));
            
            if (consolidated) {
                // Usar valores pre-calculados (COGS global correcto)
                totalIncome = consolidated.totalIncome;
                totalExpenses = consolidated.totalExpense;
                totalCOGS = consolidated.COGS;
            } else {
                // Sumar si no hay consolidado o es un filtro de "Todos" sin mes específico
                const nonConsolidated = filteredReport.filter(d => d.branchId !== 'consolidado');
                totalIncome = nonConsolidated.reduce((acc, d) => acc + d.totalIncome, 0);
                totalExpenses = nonConsolidated.reduce((acc, d) => acc + d.totalExpense, 0);
                totalCOGS = nonConsolidated.reduce((acc, d) => acc + d.COGS, 0);
            }
            
            // Siempre consolidar los detalles de gastos sumando todos los reportes individuales
            const expenseDetailsMap = filteredReport
                .filter(d => d.branchId !== 'consolidado') // Solo sumar gastos de las sucursales
                .reduce((acc, d) => {
                    d.expenseDetails.forEach(([category, amount]) => {
                        acc[category] = (acc[category] || 0) + amount;
                    });
                    return acc;
                }, {});
            expenseDetails = Object.entries(expenseDetailsMap).sort((a, b) => b[1] - a[1]);
        }
        
        // Cálculo final de utilidades para la tarjeta de resumen
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

            {/* --- CUERPO DEL REPORTE CONSOLIDADO --- */}
            {filteredReport.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tarjetas de Resumen */}
                    <Card title="Resultado Operacional" className="md:col-span-1 border-4 border-green-200">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between border-b pb-1"><span>(+) Ingresos Totales:</span><span className="font-semibold text-green-600">{fmt(totalIncome)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(-) Costo de Venta (COGS):</span><span className="font-semibold text-red-600">{fmt(totalCOGS)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(=) Utilidad Bruta:</span><span className="font-bold text-lg">{fmt(totalGrossProfit)}</span></div>
                            <div className="flex justify-between border-b pb-1"><span>(-) Gastos Operacionales:</span><span className="font-semibold text-red-600">{fmt(totalExpenses)}</span></div>
                            <div className="flex justify-between pt-1"><span>(=) Utilidad Neta:</span><span className={`font-bold text-xl ${totalNetProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(totalNetProfit)}</span></div>
                        </div>
                    </Card>

                    {/* Detalle de Gastos */}
                    <Card title="Detalle de Gastos por Categoría" className="md:col-span-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-neutral-500 sticky top-0 bg-white border-b">
                                    <th className="py-2 pr-3">Categoría</th>
                                    <th className="py-2 pr-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseDetails.map(([category, amount]) => (
                                    <tr key={category} className="border-t border-neutral-100">
                                        <td className="py-1 pr-3">{category}</td>
                                        <td className="py-1 pr-3 text-right">{fmt(amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 font-bold">
                                    <td className="py-2 pr-3">TOTAL GASTOS</td>
                                    <td className="py-2 pr-3 text-right">{fmt(totalExpenses)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </Card>

                </div>
            )}
            
            {filteredReport.length === 0 && (
                <p className="p-4 text-center text-neutral-500 border rounded-lg bg-neutral-50">
                    {aggregatedData.length === 0 
                        ? 'No hay datos de ingresos o gastos registrados para generar el reporte.'
                        : 'No hay datos que coincidan con los filtros seleccionados.'
                    }
                </p>
            )}
        </Card>
    );
}