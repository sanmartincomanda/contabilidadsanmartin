// src/components/Reports.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { fmt, peso, branchName, resolveBranchId } from '../constants';
import { calculateDepreciationExpenseForMonth, getDepreciationActiveMonths } from '../services/depreciation';
import { calculateGeneralRegimeTaxes } from '../services/tax';
import BalanceSheet from './BalanceSheet';
import DashboardGeneral from './DashboardGeneral';
import { resolveReportIncomeEntries } from '../services/incomeAggregation';
import { getLocalMonthString } from '../utils/localDate';

// --- ICONOS SVG INLINE ---
const Icons = {
    chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    scale: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    dashboard: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    chevronDown: "M19 9l-7 7-7-7",
    chevronRight: "M9 5l7 7-7 7",
    trendingUp: "M13 7h8m0 0v8m0-8l-8-8-4 4-6-6",
    trendingDown: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    wallet: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    x: "M6 18L18 6M6 6l12 12",
    shoppingCart: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
};

const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

// --- COMPONENTES UI ---

const Card = ({ title, children, className = "", right, subtitle, icon }) => (
    <div className={`erp-panel erp-panel-hover rounded-[24px] overflow-hidden ${className}`}>
        <div className="erp-panel-header flex justify-between items-center px-5 py-3.5 border-b border-[#c5dce7]">
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="rounded-xl bg-[#e8f0f5] p-2">
                        <Icon path={Icons[icon]} className="w-4 h-4 text-[#1a6f93]" />
                    </div>
                )}
                <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7784]">{title}</h3>
                    {subtitle && <p className="text-xs mt-0.5 text-[#7a919d]">{subtitle}</p>}
                </div>
            </div>
            {right}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Select = ({ label, icon, value, onChange, options = [] }) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</label>}
        <div className="relative">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72909d] pointer-events-none" />}
            <select
                value={value}
                onChange={onChange}
                className={`w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-medium text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12 appearance-none cursor-pointer pr-8 ${icon ? 'pl-10' : ''}`}
            >
                {options}
            </select>
            <Icon path={Icons.chevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72909d] pointer-events-none" />
        </div>
    </div>
);

const StatCard = ({ title, value, subtitle, icon, variant = 'default', trend }) => {
    const variants = {
        default: 'bg-white border-[#d7dfe6]',
        wine: 'bg-[#152533] text-white border-[#152533]',
        success: 'bg-[#1e7a4f] text-white border-[#1e7a4f]',
        danger: 'bg-[#b1393e] text-white border-[#b1393e]',
        warning: 'bg-[#1a6f93] text-white border-[#1a6f93]',
        dark: 'bg-[#152533] text-white border-[#152533]'
    };

    const isColored = variant !== 'default';

    return (
        <div className={`erp-panel-hover rounded-[22px] border p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,.42)] ${variants[variant]}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${isColored ? 'bg-white/15' : 'bg-[#edf4f8]'}`}>
                    <Icon path={Icons[icon]} className={`w-5 h-5 ${isColored ? 'text-white' : 'text-[#1a6f93]'}`} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-bold ${isColored ? 'text-white/70' : (parseFloat(trend) >= 0 ? 'text-emerald-600' : 'text-rose-600')}`}>
                        <Icon path={parseFloat(trend) >= 0 ? Icons.trendingUp : Icons.trendingDown} className="w-3.5 h-3.5" />
                        {Math.abs(parseFloat(trend))}%
                    </div>
                )}
            </div>
            <div className={`text-2xl font-black mb-0.5 ${isColored ? 'text-white' : 'text-[#16222d]'}`}>{value}</div>
            <div className={`text-xs font-bold uppercase tracking-wider ${isColored ? 'text-white/70' : 'text-[#5f7280]'}`}>{title}</div>
            {subtitle && <div className={`text-xs mt-1 ${isColored ? 'text-white/50' : 'text-[#81929d]'}`}>{subtitle}</div>}
        </div>
    );
};

const clampFlow = (value) => Math.max(Number(value) || 0, 0);

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const WEEKDAY_COLORS = ['#0a628f', '#1e7a4f', '#b1393e', '#a56b00', '#6d5bd0', '#168c8c', '#5c6773'];

const buildRibbonPath = ({ x0, x1, y0, h0, y1, h1 }) => {
    const startTop = y0 - (h0 / 2);
    const startBottom = y0 + (h0 / 2);
    const endTop = y1 - (h1 / 2);
    const endBottom = y1 + (h1 / 2);
    const curve = (x1 - x0) * 0.42;

    return [
        `M ${x0} ${startTop}`,
        `C ${x0 + curve} ${startTop}, ${x1 - curve} ${endTop}, ${x1} ${endTop}`,
        `L ${x1} ${endBottom}`,
        `C ${x1 - curve} ${endBottom}, ${x0 + curve} ${startBottom}, ${x0} ${startBottom}`,
        'Z',
    ].join(' ');
};

const getDateAtMidday = (dateString) => new Date(`${dateString}T12:00:00`);

const getWeekdayIndex = (dateString) => {
    const day = getDateAtMidday(dateString).getDay();
    return day === 0 ? 6 : day - 1;
};

const getWeekIndex = (dateString) => Math.max(Math.ceil(Number(dateString.substring(8, 10)) / 7) - 1, 0);

const getWeeksInMonth = (month) => {
    if (!month) return 5;
    const [year, monthNumber] = month.split('-').map(Number);
    const days = new Date(year, monthNumber, 0).getDate();
    return Math.ceil(days / 7);
};

const FinancialFlowChart = ({
    totalIncome,
    totalGrossProfit,
    totalCOGS,
    totalOperatingGrossProfit,
    totalExpenses,
    totalNetProfit,
    totalTax,
    totalDepreciation,
    totalIMI,
    totalIR,
    selectedMonth,
}) => {
    const income = clampFlow(totalIncome);
    const gross = clampFlow(totalGrossProfit);
    const cogs = clampFlow(totalCOGS);
    const operating = clampFlow(totalOperatingGrossProfit);
    const expenses = clampFlow(totalExpenses);
    const net = clampFlow(totalNetProfit);
    const depreciation = clampFlow(totalDepreciation);
    const tax = clampFlow(totalTax);

    if (!income) {
        return (
            <div className="erp-empty-state p-8 text-center">
                <div className="text-sm font-semibold text-slate-500">Sin datos suficientes para generar el flujo de resultados.</div>
                <div className="mt-1 text-xs text-slate-400">Selecciona un periodo con ingresos registrados.</div>
            </div>
        );
    }

    const totalDeductions = depreciation + tax;
    const availableHeight = 230;
    const minVisible = 8;
    const scale = availableHeight / Math.max(income, 1);
    const toHeight = (value) => {
        if (value <= 0) return 0;
        return Math.max(value * scale, minVisible);
    };

    const chartWidth = 1480;
    const chartHeight = 540;
    const xIncome = 180;
    const xGross = 500;
    const xOperating = 920;
    const xFinal = 1300;

    const sourceCenter = 255;
    const grossCenter = 165;
    const cogsCenter = 390;
    const operatingCenter = 165;
    const expensesCenter = 330;
    const netCenter = 140;
    const depreciationCenter = 320;
    const taxCenter = 430;

    const hIncome = toHeight(income);
    const hGross = toHeight(gross);
    const hCOGS = toHeight(cogs);
    const hOperating = toHeight(operating);
    const hExpenses = toHeight(expenses);
    const hNet = toHeight(net);
    const hDepreciation = toHeight(depreciation);
    const hTax = tax > 0 ? toHeight(tax) : 4;

    const palette = {
        incomeBar: '#28b6f6',
        incomeFill: 'rgba(40, 182, 246, 0.34)',
        greenBar: '#138a3d',
        greenFill: 'rgba(93, 193, 108, 0.33)',
        redBar: '#ff3b30',
        redFill: 'rgba(255, 107, 107, 0.64)',
        stageBar: '#5b6470',
    };

    const formatValue = (value) => fmt(value);
    const formatShare = (value) => {
        if (!totalIncome) return '0.0%';
        return `${((Math.abs(value) / totalIncome) * 100).toFixed(1)}%`;
    };

    return (
        <div className="overflow-x-auto">
            <div className="flex min-w-[1360px] justify-center rounded-[26px] border border-[#d7e2e9] bg-[linear-gradient(180deg,#fbfdff_0%,#f2f8fb_100%)] p-5">
                <div className="w-full max-w-[1380px]">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Flujo del resultado</div>
                        <div className="text-sm font-bold text-[#16222d]">Mapa financiero del periodo</div>
                    </div>
                    <div className="rounded-full border border-[#d7e2e9] bg-white px-3 py-1 text-xs font-semibold text-[#5d7784]">
                        {selectedMonth}
                    </div>
                </div>

                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full">
                    <defs>
                        <linearGradient id="incomeFlow" x1="0%" x2="100%">
                            <stop offset="0%" stopColor="rgba(40, 182, 246, 0.55)" />
                            <stop offset="100%" stopColor="rgba(40, 182, 246, 0.26)" />
                        </linearGradient>
                        <linearGradient id="greenFlow" x1="0%" x2="100%">
                            <stop offset="0%" stopColor="rgba(103, 199, 118, 0.42)" />
                            <stop offset="100%" stopColor="rgba(147, 214, 143, 0.26)" />
                        </linearGradient>
                        <linearGradient id="redFlow" x1="0%" x2="100%">
                            <stop offset="0%" stopColor="rgba(255, 117, 117, 0.58)" />
                            <stop offset="100%" stopColor="rgba(255, 117, 117, 0.33)" />
                        </linearGradient>
                    </defs>

                    <path d={buildRibbonPath({ x0: xIncome, x1: xGross, y0: sourceCenter, h0: hIncome, y1: grossCenter, h1: hGross })} fill="url(#incomeFlow)" />
                    <path d={buildRibbonPath({ x0: xIncome, x1: xGross, y0: sourceCenter, h0: hIncome, y1: cogsCenter, h1: hCOGS })} fill="url(#redFlow)" opacity="0.96" />

                    <path d={buildRibbonPath({ x0: xGross, x1: xOperating, y0: grossCenter, h0: hGross, y1: operatingCenter, h1: hOperating })} fill="url(#greenFlow)" />
                    <path d={buildRibbonPath({ x0: xGross, x1: xOperating, y0: grossCenter, h0: hGross, y1: expensesCenter, h1: hExpenses })} fill="url(#redFlow)" />

                    <path d={buildRibbonPath({ x0: xOperating, x1: xFinal, y0: operatingCenter, h0: hOperating, y1: netCenter, h1: hNet })} fill="url(#greenFlow)" />
                    <path d={buildRibbonPath({ x0: xOperating, x1: xFinal, y0: operatingCenter, h0: hOperating, y1: depreciationCenter, h1: hDepreciation || minVisible })} fill="url(#redFlow)" />
                    <path d={buildRibbonPath({ x0: xOperating, x1: xFinal, y0: operatingCenter, h0: hOperating, y1: taxCenter, h1: hTax })} fill="url(#redFlow)" opacity="0.78" />

                    <rect x={xIncome - 7} y={sourceCenter - (hIncome / 2)} width="14" height={hIncome} rx="5" fill={palette.incomeBar} />
                    <rect x={xGross - 7} y={grossCenter - (hGross / 2)} width="14" height={hGross} rx="5" fill={palette.greenBar} />
                    <rect x={xGross - 7} y={cogsCenter - (hCOGS / 2)} width="14" height={hCOGS} rx="5" fill={palette.redBar} />
                    <rect x={xOperating - 7} y={operatingCenter - (hOperating / 2)} width="14" height={hOperating} rx="5" fill={palette.greenBar} />
                    <rect x={xOperating - 7} y={expensesCenter - (hExpenses / 2)} width="14" height={hExpenses} rx="5" fill={palette.redBar} />
                    <rect x={xFinal - 7} y={netCenter - (hNet / 2)} width="14" height={hNet} rx="5" fill={palette.greenBar} />
                    <rect x={xFinal - 7} y={depreciationCenter - ((hDepreciation || minVisible) / 2)} width="14" height={hDepreciation || minVisible} rx="5" fill={palette.redBar} />
                    <rect x={xFinal - 7} y={taxCenter - (hTax / 2)} width="14" height={hTax} rx="5" fill={palette.redBar} opacity="0.86" />

                    <text x="40" y="145" fontSize="13" fontWeight="800" fill="#2a7fa3">INGRESOS</text>
                    <text x="40" y="170" fontSize="22" fontWeight="900" fill="#0f3d56">{formatValue(totalIncome)}</text>
                    <text x="40" y="193" fontSize="12" fontWeight="700" fill="#5b95b4">{formatShare(totalIncome)}</text>

                    <text x="565" y="145" fontSize="14" fontWeight="800" fill="#1c7a31">INGRESO BRUTO</text>
                    <text x="565" y="170" fontSize="20" fontWeight="900" fill="#185f2a">{formatValue(totalGrossProfit)}</text>
                    <text x="565" y="193" fontSize="12" fontWeight="700" fill="#4f8d57">{formatShare(totalGrossProfit)}</text>

                    <text x="565" y="385" fontSize="14" fontWeight="800" fill="#cc3127">COSTO DE VENTA</text>
                    <text x="565" y="410" fontSize="20" fontWeight="900" fill="#c62e24">{formatValue(totalCOGS)}</text>
                    <text x="565" y="433" fontSize="12" fontWeight="700" fill="#d66d65">{formatShare(totalCOGS)}</text>

                    <text x="985" y="148" fontSize="14" fontWeight="800" fill="#1c7a31">BENEFICIO OPERATIVO</text>
                    <text x="985" y="173" fontSize="20" fontWeight="900" fill="#185f2a">{formatValue(totalOperatingGrossProfit)}</text>
                    <text x="985" y="196" fontSize="12" fontWeight="700" fill="#4f8d57">{formatShare(totalOperatingGrossProfit)}</text>

                    <text x="985" y="325" fontSize="14" fontWeight="800" fill="#cc3127">GASTOS OPERATIVOS</text>
                    <text x="985" y="350" fontSize="20" fontWeight="900" fill="#c62e24">{formatValue(totalExpenses)}</text>
                    <text x="985" y="373" fontSize="12" fontWeight="700" fill="#d66d65">{formatShare(totalExpenses)}</text>

                    <text x="1340" y="125" fontSize="14" fontWeight="800" fill="#1c7a31">RESULTADO NETO</text>
                    <text x="1340" y="150" fontSize="20" fontWeight="900" fill="#185f2a">{formatValue(totalNetProfit)}</text>
                    <text x="1340" y="173" fontSize="12" fontWeight="700" fill="#4f8d57">{formatShare(totalNetProfit)}</text>

                    <text x="1340" y="305" fontSize="14" fontWeight="800" fill="#cc3127">DEPRECIACIONES</text>
                    <text x="1340" y="330" fontSize="20" fontWeight="900" fill="#c62e24">{formatValue(totalDepreciation)}</text>
                    <text x="1340" y="353" fontSize="12" fontWeight="700" fill="#d66d65">{formatShare(totalDepreciation)}</text>

                    <text x="1340" y="415" fontSize="14" fontWeight="800" fill="#cc3127">IMPUESTO</text>
                    <text x="1340" y="440" fontSize="20" fontWeight="900" fill="#c62e24">{formatValue(totalTax)}</text>
                    <text x="1340" y="463" fontSize="12" fontWeight="700" fill="#d66d65">{formatShare(totalTax)}</text>
                    <text x="1340" y="484" fontSize="11" fontWeight="700" fill="#cc6e66">IMI {formatValue(totalIMI)} | IR {formatValue(totalIR)}</text>

                    <text x={chartWidth / 2} y="40" textAnchor="middle" fontSize="12" fontWeight="800" fill="#6b7f8c">DE DONDE VIENEN Y PARA QUE SE UTILIZAN LOS INGRESOS</text>
                </svg>
                </div>
            </div>
        </div>
    );
};

// --- MODAL DE DETALLES DE GASTO ---
const ExpenseDetailModal = ({ category, expenses, onClose }) => {
    if (!category) return null;
    const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-[#2b1113]/40 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg rounded-2xl border border-[#e6c9b8] bg-white shadow-2xl shadow-[#7f1218]/20 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="bg-[#7f1218] px-5 py-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#f2b635] mb-0.5">Detalle de transacciones</div>
                        <div className="text-base font-black text-white uppercase">{category}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                    >
                        <Icon path={Icons.x} className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal body */}
                <div className="p-5 max-h-96 overflow-y-auto space-y-2">
                    {expenses.length === 0 ? (
                        <p className="text-center text-stone-400 text-sm py-6">Sin transacciones</p>
                    ) : (
                        expenses.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                                <div>
                                    <div className="text-xs font-bold text-stone-400">{item.dateStr}</div>
                                    <div className="text-sm font-semibold text-stone-800">{item.description}</div>
                                </div>
                                <div className="text-sm font-black text-[#7f1218]">{fmt(peso(item.amount))}</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal footer */}
                <div className="border-t border-[#ead5c5] bg-stone-50 px-5 py-3 flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Total {category}</div>
                    <div className="text-lg font-black text-[#7f1218]">{fmt(total)}</div>
                </div>
            </div>
        </div>
    );
};

// --- REPORTES ESPECIALES ---
const MonthlyExpenseReport = ({ rows, totalExpenses, onSelectCategory }) => {
    const activeRows = rows.filter((row) => row.amount > 0);
    const topCategory = activeRows[0];

    if (!activeRows.length) {
        return (
            <Card title="Reporte de Gastos Mensuales" subtitle="Categorias y participacion del periodo" icon="receipt">
                <div className="erp-empty-state p-8 text-center">
                    <div className="text-sm font-semibold text-slate-500">Sin gastos registrados en este periodo.</div>
                    <div className="mt-1 text-xs text-slate-400">Selecciona otro mes o registra gastos para ver el analisis.</div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard title="Gasto total" value={fmt(totalExpenses)} icon="trendingDown" variant="danger" />
                <StatCard title="Categorias activas" value={activeRows.length} icon="receipt" />
                <StatCard
                    title="Mayor categoria"
                    value={topCategory ? `${topCategory.percentage.toFixed(1)}%` : '0%'}
                    subtitle={topCategory?.category || 'Sin datos'}
                    icon="chart"
                    variant="warning"
                />
            </div>

            <Card title="Reporte de Gastos Mensuales" subtitle="Participacion por categoria sobre el gasto total" icon="receipt">
                <div className="space-y-3">
                    {activeRows.map((row, index) => (
                        <button
                            key={row.category}
                            type="button"
                            onClick={() => onSelectCategory(row.category)}
                            className="erp-pressable w-full rounded-xl border border-[#d9e6ed] bg-white p-4 text-left shadow-[0_10px_22px_-20px_rgba(15,23,42,.45)] transition hover:border-[#9fc3d5]"
                        >
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Categoria</div>
                                    <div className="mt-1 text-sm font-black uppercase text-[#182b36]">{row.category}</div>
                                </div>
                                <div className="text-right">
                                    <div className="erp-mono text-base font-black text-[#b1393e]">{fmt(row.amount)}</div>
                                    <div className="text-xs font-bold text-[#6b7f8c]">{row.percentage.toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-[#e9f1f5]">
                                <div
                                    className="h-full rounded-full bg-[#b1393e] transition-all duration-700"
                                    style={{ width: `${Math.min(row.percentage, 100)}%` }}
                                />
                            </div>
                            <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                <span>Rank #{index + 1}</span>
                                <span>Ver detalle</span>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
};

const MonthlySalesWeekdayReport = ({ report }) => {
    const { totalSales, maxAmount, weekLabels, weekdayRows, weekTotals, bestDay, bestWeek } = report;

    if (!totalSales) {
        return (
            <Card title="Reporte de Ventas Mensual" subtitle="Ventas por semana y dia de la semana" icon="chart">
                <div className="erp-empty-state p-8 text-center">
                    <div className="text-sm font-semibold text-slate-500">Sin ventas registradas en este periodo.</div>
                    <div className="mt-1 text-xs text-slate-400">Selecciona un mes con ingresos para ver la tendencia.</div>
                </div>
            </Card>
        );
    }

    const width = 900;
    const height = 360;
    const left = 72;
    const right = 28;
    const top = 32;
    const bottom = 58;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const safeMax = Math.max(maxAmount, 1);
    const xForWeek = (index) => left + (weekLabels.length <= 1 ? 0 : (plotWidth / (weekLabels.length - 1)) * index);
    const yForValue = (value) => top + plotHeight - ((Number(value) || 0) / safeMax) * plotHeight;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard title="Ventas del mes" value={fmt(totalSales)} icon="trendingUp" variant="success" />
                <StatCard title="Dia mas fuerte" value={bestDay?.label || 'N/D'} subtitle={bestDay ? fmt(bestDay.total) : ''} icon="calendar" />
                <StatCard title="Semana mas fuerte" value={bestWeek?.label || 'N/D'} subtitle={bestWeek ? fmt(bestWeek.total) : ''} icon="chart" variant="warning" />
            </div>

            <Card title="Reporte de Ventas Mensual" subtitle="Comportamiento por dia de la semana entre semanas del mes" icon="chart">
                <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
                            <rect x="0" y="0" width={width} height={height} rx="18" fill="#f8fbfd" />
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                                const y = top + plotHeight * ratio;
                                const value = safeMax * (1 - ratio);
                                return (
                                    <g key={ratio}>
                                        <line x1={left} x2={width - right} y1={y} y2={y} stroke="#d9e6ed" strokeDasharray="4 6" />
                                        <text x={left - 10} y={y + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#7a919d">
                                            {fmt(value)}
                                        </text>
                                    </g>
                                );
                            })}

                            {weekLabels.map((label, index) => {
                                const x = xForWeek(index);
                                return (
                                    <g key={label}>
                                        <line x1={x} x2={x} y1={top} y2={top + plotHeight} stroke="#edf3f6" />
                                        <text x={x} y={height - 24} textAnchor="middle" fontSize="12" fontWeight="800" fill="#5d7784">
                                            {label}
                                        </text>
                                    </g>
                                );
                            })}

                            {weekdayRows.map((row) => {
                                if (row.total <= 0) return null;
                                const points = row.values.map((value, index) => `${xForWeek(index)},${yForValue(value)}`).join(' ');
                                return (
                                    <g key={row.label}>
                                        <polyline points={points} fill="none" stroke={row.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        {row.values.map((value, index) => (
                                            <circle key={`${row.label}-${index}`} cx={xForWeek(index)} cy={yForValue(value)} r={value > 0 ? 4.5 : 2.5} fill={row.color} stroke="#ffffff" strokeWidth="2" />
                                        ))}
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {weekdayRows.map((row) => (
                                <div key={row.label} className="flex items-center gap-2 rounded-full border border-[#d9e6ed] bg-white px-3 py-1.5 text-xs font-bold text-[#445b68]">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                    {row.label}
                                    <span className="erp-mono text-[#7a919d]">{fmt(row.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                        <thead>
                            <tr className="border-b border-[#d9e6ed] text-left">
                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-[#607888]">Semana</th>
                                {WEEKDAY_LABELS.map((day) => (
                                    <th key={day} className="pb-3 text-right text-xs font-bold uppercase tracking-wider text-[#607888]">{day}</th>
                                ))}
                                <th className="pb-3 text-right text-xs font-bold uppercase tracking-wider text-[#607888]">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf3f6]">
                            {weekLabels.map((label, weekIndex) => (
                                <tr key={label}>
                                    <td className="py-3 text-sm font-black text-[#182b36]">{label}</td>
                                    {WEEKDAY_LABELS.map((day, dayIndex) => (
                                        <td key={`${label}-${day}`} className="py-3 text-right text-sm font-semibold text-[#445b68]">
                                            {fmt(weekdayRows[dayIndex]?.values[weekIndex] || 0)}
                                        </td>
                                    ))}
                                    <td className="py-3 text-right text-sm font-black text-[#0a628f]">{fmt(weekTotals[weekIndex] || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// --- LÓGICA DE AGREGACIÓN ---
const aggregateData = (data) => {
    const results = {};
    const { ingresos = [], gastos = [], inventarios = [], compras = [], presupuestos = [], cuentas_por_pagar: facturasCredito = [] } = data;
    const normalizedIngresos = resolveReportIncomeEntries(ingresos);

    const getDateString = (firestoreDate, fallback = '') => {
        if (typeof firestoreDate === 'string') return firestoreDate;
        if (firestoreDate && firestoreDate.toDate) return firestoreDate.toDate().toISOString().substring(0, 10);
        return fallback;
    };

    const getMonthString = (item, primaryKeys = []) => {
        const directDate = primaryKeys.map((key) => item[key]).find(Boolean);
        const dateString = getDateString(directDate);
        if (dateString) return dateString.substring(0, 7);
        return item.month || item.mes || '';
    };

    const ensureBranchData = (month, branchId) => {
        if (!month || !branchId) return null;

        results[month] = results[month] || {};
        results[month][branchId] = results[month][branchId] || {
            totalIncome: 0,
            totalExpense: 0,
            totalPurchases: 0,
            expenseDetails: {},
            rawExpenses: []
        };

        return results[month][branchId];
    };

    const legacyPurchasesByMonth = {};

    const budgetsByMonth = presupuestos.reduce((acc, p) => {
        acc[p.month] = acc[p.month] || {};
        acc[p.month][p.category] = (acc[p.month][p.category] || 0) + peso(p.amount);
        return acc;
    }, {});

    const mirroredFacturaIds = new Set(
        compras
            .map((item) => item.sourceFacturaId || item.linkedPayableId || (item.id?.startsWith('credito_') ? item.id.replace('credito_', '') : ''))
            .filter(Boolean)
    );

    [...normalizedIngresos, ...gastos].forEach(item => {
        const dateString = getDateString(item.date || item.fecha);
        const month = dateString.substring(0, 7);
        const branchId = resolveBranchId(item.branch || item.branchId || item.sucursal || item.branchName);
        const branchData = ensureBranchData(month, branchId);
        if (!branchData) return;

        if (item.category) {
            branchData.totalExpense += peso(item.amount ?? item.monto);
            branchData.expenseDetails[item.category] = (branchData.expenseDetails[item.category] || 0) + peso(item.amount ?? item.monto);
            branchData.rawExpenses.push({ ...item, dateStr: dateString, amount: peso(item.amount ?? item.monto) });
        } else {
            branchData.totalIncome += peso(item.amount ?? item.monto);
        }
    });

    inventarios.forEach(item => {
        const month = item.month || item.mes;
        const branchId = resolveBranchId(item.branch || item.branchId || item.sucursal || item.branchName);
        const branchData = ensureBranchData(month, branchId);
        if (!branchData) return;

        if (item.type === 'inicial') branchData.initialInventory = peso(item.amount);
        else if (item.type === 'final') branchData.finalInventory = peso(item.amount);
    });

    compras.forEach(item => {
        const month = getMonthString(item, ['date', 'fecha']);
        const branchId = resolveBranchId(item.branch || item.branchId || item.sucursal || item.branchName);
        const amount = peso(item.amount ?? item.monto);

        if (!amount || !month) return;
        results[month] = results[month] || {};

        if (!branchId) {
            legacyPurchasesByMonth[month] = (legacyPurchasesByMonth[month] || 0) + amount;
            return;
        }

        const branchData = ensureBranchData(month, branchId);
        if (!branchData) return;
        branchData.totalPurchases += amount;
    });

    facturasCredito.forEach(item => {
        if (item.id && mirroredFacturaIds.has(item.id)) return;

        const month = getMonthString(item, ['fecha', 'date']);
        const branchId = resolveBranchId(item.branch || item.branchId || item.sucursal || item.branchName);
        const amount = peso(item.monto ?? item.amount);

        if (!amount || !month) return;
        results[month] = results[month] || {};

        if (!branchId) {
            legacyPurchasesByMonth[month] = (legacyPurchasesByMonth[month] || 0) + amount;
            return;
        }

        const branchData = ensureBranchData(month, branchId);
        if (!branchData) return;
        branchData.totalPurchases += amount;
    });

    return Object.entries(results).map(([month, branchesData]) => {
        const branchEntriesArray = Object.values(branchesData);
        const totalIncomeMonth = branchEntriesArray.reduce((sum, data) => sum + data.totalIncome, 0);
        const totalLegacyPurchases = legacyPurchasesByMonth[month] || 0;
        const monthlyBudget = budgetsByMonth[month] || {};

        const branchEntries = Object.entries(branchesData).map(([branchId, data]) => {
            const salesPercentage = totalIncomeMonth > 0 ? (data.totalIncome / totalIncomeMonth) : 0;
            const distributedLegacyPurchases = totalLegacyPurchases * salesPercentage;
            const initialInv = data.initialInventory || 0;
            const finalInv = data.finalInventory || 0;
            const totalPurchases = (data.totalPurchases || 0) + distributedLegacyPurchases;

            const COGS = initialInv + totalPurchases - finalInv;
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
                totalPurchases: totalPurchases,
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
        const totalDirectPurchasesMonth = branchEntriesArray.reduce((sum, branchData) => sum + (branchData.totalPurchases || 0), 0);
        const totalPurchasesGlobal = totalDirectPurchasesMonth + totalLegacyPurchases;
        const COGS_consolidado = totalInitialInv + totalPurchasesGlobal - totalFinalInv;

        branchEntries.push({
            month,
            branchId: 'consolidado',
            branchName: 'Reporte Consolidado Mensual',
            isConsolidated: true,
            totalIncome: totalIncomeMonth,
            totalExpense: totalExpenseMonth,
            totalPurchases: totalPurchasesGlobal,
            initialInventory: totalInitialInv,
            finalInventory: totalFinalInv,
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
    const [selectedMonth, setSelectedMonth] = useState(getLocalMonthString());
    const [modalCategory, setModalCategory] = useState(null);

    const aggregatedData = useMemo(() => aggregateData(data), [data]);

    const availableMonths = useMemo(() => {
        const depreciationMonths = (data.depreciaciones || []).flatMap((item) => getDepreciationActiveMonths(item));
        const months = [...new Set([...aggregatedData.map(d => d.month), ...depreciationMonths].filter(Boolean))];
        return months.sort((a, b) => b.localeCompare(a));
    }, [aggregatedData, data.depreciaciones]);

    const filteredReport = useMemo(() => {
        return aggregatedData.filter(d => selectedMonth ? d.month === selectedMonth : true);
    }, [aggregatedData, selectedMonth]);

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCOGS = 0;
    let totalPurchasesOnly = 0;
    let inventoryAdjustment = 0;
    let totalGrossProfit = 0;
    let totalOperatingGrossProfit = 0;
    let totalDepreciation = 0;
    let totalIMI = 0;
    let totalIR = 0;
    let totalTax = 0;
    let totalNetProfit = 0;
    let currentBudgets = {};
    let filteredRawExpenses = [];
    let finalExpenseRows = [];

    if (filteredReport.length > 0) {
        const d = filteredReport.find(x => x.branchId === 'consolidado');
        if (d) {
            totalIncome = d.totalIncome;
            totalExpenses = d.totalExpense;
            totalCOGS = d.COGS;
            totalPurchasesOnly = d.totalPurchases;
            // Ajuste de inventario = Inicial - Final (stored in consolidated since we added them)
            inventoryAdjustment = (d.initialInventory || 0) - (d.finalInventory || 0);
            currentBudgets = d.budgets || {};
            filteredRawExpenses = d.rawExpenses;

            const allCategories = new Set([
                ...Object.keys(currentBudgets),
                ...filteredReport.filter(x => !x.isConsolidated).flatMap(x => x.expenseDetails.map(ed => ed[0]))
            ]);

            const expenseMap = {};
            allCategories.forEach(cat => {
                const realAmount = filteredReport
                    .filter(x => !x.isConsolidated)
                    .reduce((acc, curr) => acc + (curr.expenseDetails.find(ed => ed[0] === cat)?.[1] || 0), 0);
                expenseMap[cat] = realAmount;
            });

            finalExpenseRows = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]);
        }
    }

    totalGrossProfit = totalIncome - totalCOGS;
    totalOperatingGrossProfit = totalGrossProfit - totalExpenses;
    totalDepreciation = calculateDepreciationExpenseForMonth(data.depreciaciones || [], selectedMonth);
    const taxBreakdown = calculateGeneralRegimeTaxes(totalIncome, totalOperatingGrossProfit, totalDepreciation);
    totalIMI = taxBreakdown.imi;
    totalIR = taxBreakdown.ir;
    totalTax = taxBreakdown.totalTax;
    totalNetProfit = taxBreakdown.netProfit;

    const totalBudgetLimit = useMemo(() => {
        return Object.values(currentBudgets).reduce((acc, val) => acc + val, 0);
    }, [currentBudgets]);

    const totalExecution = totalBudgetLimit > 0 ? (totalExpenses / totalBudgetLimit) * 100 : 0;
    const expenseCategoryRows = finalExpenseRows
        .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }))
        .filter((row) => row.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    const salesWeekdayReport = useMemo(() => {
        const weekCount = getWeeksInMonth(selectedMonth);
        const weekLabels = Array.from({ length: weekCount }, (_, index) => `Sem ${index + 1}`);
        const matrix = WEEKDAY_LABELS.map((label, dayIndex) => ({
            label,
            dayIndex,
            color: WEEKDAY_COLORS[dayIndex],
            values: Array.from({ length: weekCount }, () => 0),
        }));

        resolveReportIncomeEntries(data.ingresos || [])
            .filter((income) => income.date?.startsWith(selectedMonth))
            .forEach((income) => {
                const weekIndex = getWeekIndex(income.date);
                const dayIndex = getWeekdayIndex(income.date);
                if (weekIndex < 0 || weekIndex >= weekCount || dayIndex < 0 || dayIndex > 6) return;
                matrix[dayIndex].values[weekIndex] += peso(income.amount);
            });

        const weekdayRows = matrix.map((row) => ({
            ...row,
            total: row.values.reduce((sum, value) => sum + value, 0),
        }));
        const weekTotals = weekLabels.map((_, weekIndex) => (
            weekdayRows.reduce((sum, row) => sum + row.values[weekIndex], 0)
        ));
        const totalSales = weekTotals.reduce((sum, value) => sum + value, 0);
        const maxAmount = Math.max(...weekdayRows.flatMap((row) => row.values), 0);
        const bestDay = weekdayRows.reduce((best, row) => row.total > (best?.total || 0) ? row : best, null);
        const bestWeekIndex = weekTotals.reduce((bestIndex, total, index) => total > (weekTotals[bestIndex] || 0) ? index : bestIndex, 0);

        return {
            totalSales,
            maxAmount,
            weekLabels,
            weekdayRows,
            weekTotals,
            bestDay,
            bestWeek: weekLabels.length ? { label: weekLabels[bestWeekIndex], total: weekTotals[bestWeekIndex] || 0 } : null,
        };
    }, [data.ingresos, selectedMonth]);

    const tabsConfig = {
        'Resultados': { icon: 'chart', label: 'Estado de Resultados' },
        'Gastos Mensuales': { icon: 'receipt', label: 'Gastos Mensuales' },
        'Ventas Mensuales': { icon: 'trendingUp', label: 'Ventas Mensuales' },
        'Balance': { icon: 'scale', label: 'Balance General' },
        'Dashboard': { icon: 'dashboard', label: 'Dashboard' }
    };

    const modalExpenses = modalCategory
        ? filteredRawExpenses.filter(item => item.category === modalCategory)
        : [];

    return (
        <div className="space-y-5">
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f5f0ec; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #c8a898; border-radius: 3px; }
            `}</style>

            {/* Expense detail modal */}
            <ExpenseDetailModal
                category={modalCategory}
                expenses={modalExpenses}
                onClose={() => setModalCategory(null)}
            />

            {/* Page header */}
            <div className="erp-panel overflow-hidden rounded-[24px]">
                <div className="erp-panel-header flex flex-wrap items-end justify-between gap-4 px-5 py-4">
                    <div>
                        <div className="erp-page-title">Finance desk</div>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Reportes</h1>
                    </div>
                    <span className="erp-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                        {selectedMonth || 'Periodo'}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="erp-command-strip rounded-[24px] p-2">
                <div className="erp-mobile-tabs -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                    {Object.entries(tabsConfig).map(([tab, config]) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`erp-pressable flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                                activeTab === tab
                                    ? 'bg-[#152533] text-white shadow-[0_16px_26px_-18px_rgba(15,23,42,.8)]'
                                    : 'text-[#55717f] hover:bg-white'
                            }`}
                        >
                            <Icon path={Icons[config.icon]} className="w-3.5 h-3.5" />
                            {config.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {activeTab === 'Balance' && (
                <div className="animate-fade-in">
                    <BalanceSheet data={data} />
                </div>
            )}

            {activeTab === 'Dashboard' && (
                <div className="animate-fade-in">
                    <DashboardGeneral />
                </div>
            )}

            {activeTab === 'Gastos Mensuales' && (
                <div className="animate-fade-in space-y-5">
                    <div className="max-w-sm">
                        <Select
                            label="Periodo de Analisis"
                            icon="calendar"
                            value={selectedMonth || ''}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setModalCategory(null);
                            }}
                            options={availableMonths.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        />
                    </div>
                    <MonthlyExpenseReport
                        rows={expenseCategoryRows}
                        totalExpenses={totalExpenses}
                        onSelectCategory={setModalCategory}
                    />
                </div>
            )}

            {activeTab === 'Ventas Mensuales' && (
                <div className="animate-fade-in space-y-5">
                    <div className="max-w-sm">
                        <Select
                            label="Periodo de Analisis"
                            icon="calendar"
                            value={selectedMonth || ''}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setModalCategory(null);
                            }}
                            options={availableMonths.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        />
                    </div>
                    <MonthlySalesWeekdayReport report={salesWeekdayReport} />
                </div>
            )}

            {activeTab === 'Resultados' && (
                <div className="animate-fade-in space-y-5">
                    {/* Filtro de periodo */}
                    <div className="max-w-sm">
                        <Select
                            label="Periodo de Análisis"
                            icon="calendar"
                            value={selectedMonth || ''}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setModalCategory(null);
                            }}
                            options={availableMonths.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        />
                    </div>

                    {/* KPI cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                        <StatCard
                            title="Ingresos Totales"
                            value={fmt(totalIncome)}
                            icon="trendingUp"
                            variant="success"
                        />
                        <StatCard
                            title="Costo con Merma"
                            value={fmt(totalCOGS)}
                            subtitle="Compras + Ajuste Inv."
                            icon="shoppingCart"
                            variant="warning"
                        />
                        <StatCard
                            title="Utilidad Bruta"
                            value={fmt(totalGrossProfit)}
                            icon="dollar"
                            variant={totalGrossProfit >= 0 ? 'wine' : 'danger'}
                            trend={totalIncome > 0 ? ((totalGrossProfit / totalIncome) * 100).toFixed(1) : 0}
                        />
                        <StatCard
                            title="Utilidad Operativa Bruta"
                            value={fmt(totalOperatingGrossProfit)}
                            subtitle="Antes de depreciacion e impuesto"
                            icon="wallet"
                            variant={totalOperatingGrossProfit >= 0 ? 'default' : 'danger'}
                            trend={totalIncome > 0 ? ((totalOperatingGrossProfit / totalIncome) * 100).toFixed(1) : 0}
                        />
                        <StatCard
                            title="Depreciaciones"
                            value={fmt(totalDepreciation)}
                            icon="receipt"
                            variant="warning"
                        />
                        <StatCard
                            title="Utilidad Neta"
                            value={fmt(totalNetProfit)}
                            icon="wallet"
                            variant={totalNetProfit >= 0 ? 'dark' : 'danger'}
                            trend={totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(1) : 0}
                        />
                    </div>

                    <Card
                        title="Mapa Financiero"
                        subtitle="Vista visual del flujo de resultados del periodo"
                        icon="dashboard"
                    >
                        <FinancialFlowChart
                            totalIncome={totalIncome}
                            totalGrossProfit={totalGrossProfit}
                            totalCOGS={totalCOGS}
                            totalOperatingGrossProfit={totalOperatingGrossProfit}
                            totalExpenses={totalExpenses}
                            totalNetProfit={totalNetProfit}
                            totalTax={totalTax}
                            totalDepreciation={totalDepreciation}
                            totalIMI={totalIMI}
                            totalIR={totalIR}
                            selectedMonth={selectedMonth}
                        />
                    </Card>

                    {/* Main grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Resumen Ejecutivo */}
                        <div className="lg:col-span-1">
                            <Card title="Resumen Ejecutivo" subtitle="Rentabilidad mensual" icon="chart" gradient={true}>
                                <div className="space-y-2">
                                    {/* Ingresos */}
                                    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                <Icon path={Icons.trendingUp} className="w-4 h-4 text-emerald-700" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-stone-500 font-bold uppercase tracking-wide">Ingresos</div>
                                                <div className="text-base font-black text-stone-800">{fmt(totalIncome)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Separador COGS */}
                                    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-200">
                                            <div className="text-xs font-bold uppercase tracking-wide text-stone-500">Costo de Venta</div>
                                        </div>
                                        {/* Compra de Mercancía */}
                                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                                <div className="text-xs font-semibold text-stone-600">Compra de Mercancía</div>
                                            </div>
                                            <div className="text-sm font-bold text-stone-700">{fmt(totalPurchasesOnly)}</div>
                                        </div>
                                        {/* Ajuste de inventario */}
                                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                                <div className="text-xs font-semibold text-stone-600">Ajuste Inv. (Inicial − Final)</div>
                                            </div>
                                            <div className={`text-sm font-bold ${inventoryAdjustment >= 0 ? 'text-stone-700' : 'text-emerald-700'}`}>
                                                {inventoryAdjustment >= 0 ? '' : '−'}{fmt(Math.abs(inventoryAdjustment))}
                                            </div>
                                        </div>
                                        {/* Costo con merma */}
                                        <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">Costo con Merma Ajustada</div>
                                            </div>
                                            <div className="text-sm font-black text-amber-800">{fmt(totalCOGS)}</div>
                                        </div>
                                    </div>

                                    {/* Utilidad Bruta */}
                                    <div className="flex items-center justify-between rounded-xl bg-emerald-500 p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                                <Icon path={Icons.dollar} className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-emerald-100 font-bold uppercase tracking-wide">Utilidad Bruta</div>
                                                <div className="text-base font-black text-white">{fmt(totalGrossProfit)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-emerald-100 font-bold">Margen</div>
                                            <div className="text-sm font-bold text-white">
                                                {totalIncome > 0 ? ((totalGrossProfit / totalIncome) * 100).toFixed(1) : 0}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gastos operativos */}
                                    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                                <Icon path={Icons.trendingDown} className="w-4 h-4 text-orange-700" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-stone-500 font-bold uppercase tracking-wide">Gastos Operativos</div>
                                                <div className="text-base font-black text-stone-700">{fmt(totalExpenses)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Utilidad operativa bruta */}
                                    <div className="flex items-center justify-between rounded-xl border border-[#c7d7e2] bg-[#f6fbfe] p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ddecf6]">
                                                <Icon path={Icons.wallet} className="w-4 h-4 text-[#1a6f93]" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-wide text-[#4b6979]">Utilidad Operativa Bruta</div>
                                                <div className="text-base font-black text-[#173042]">{fmt(totalOperatingGrossProfit)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Depreciaciones */}
                                    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                                <Icon path={Icons.receipt} className="w-4 h-4 text-slate-700" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-wide text-stone-500">Depreciaciones</div>
                                                <div className="text-base font-black text-stone-700">{fmt(totalDepreciation)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Impuesto */}
                                    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
                                                <Icon path={Icons.alert} className="w-4 h-4 text-stone-600" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-wide text-stone-500">Impuesto</div>
                                                <div className="text-xs font-medium text-stone-500">IMI {fmt(totalIMI)} + IR {fmt(totalIR)}</div>
                                            </div>
                                        </div>
                                        <div className="text-base font-black text-stone-700">{fmt(totalTax)}</div>
                                    </div>

                                    {/* Utilidad Neta */}
                                    <div className={`flex items-center justify-between rounded-xl p-3 ${
                                        totalNetProfit >= 0 ? 'bg-[#7f1218]' : 'bg-rose-600'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                                <Icon path={Icons.wallet} className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-white/70 font-bold uppercase tracking-wide">Utilidad Neta</div>
                                                <div className="text-xl font-black text-white">{fmt(totalNetProfit)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-white/70 font-bold">% Ingreso</div>
                                            <div className="text-base font-bold text-white">
                                                {totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(1) : 0}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Desglose de Gastos */}
                        <div className="lg:col-span-2">
                            <Card
                                title="Desglose Operativo"
                                subtitle="Haz clic en una categoría para ver el detalle"
                                icon="receipt"
                            >
                                <div className="space-y-3 md:hidden">
                                    {finalExpenseRows.map(([category, amount]) => {
                                        const budget = currentBudgets[category] || 0;
                                        const execPercent = budget > 0 ? (amount / budget) * 100 : 0;
                                        const hasData = amount > 0;

                                        return (
                                            <button
                                                key={category}
                                                type="button"
                                                disabled={!hasData}
                                                onClick={() => hasData && setModalCategory(category)}
                                                className={`erp-mobile-record w-full p-4 text-left ${hasData ? 'erp-pressable' : 'opacity-60'}`}
                                            >
                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Categoria</div>
                                                        <div className="mt-1 text-sm font-black uppercase text-stone-700">{category}</div>
                                                    </div>
                                                    <div className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-bold ${
                                                        budget > 0
                                                            ? execPercent > 100
                                                                ? 'bg-rose-100 text-rose-700'
                                                                : execPercent > 80
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {budget > 0 ? `${execPercent.toFixed(1)}%` : 'Sin presupuesto'}
                                                    </div>
                                                </div>
                                                <div className="erp-mobile-keyvalue">
                                                    <div className="erp-mobile-keyvalue-row">
                                                        <span>Real</span>
                                                        <span className="erp-mono font-extrabold text-stone-800">{fmt(amount)}</span>
                                                    </div>
                                                    <div className="erp-mobile-keyvalue-row">
                                                        <span>Presupuesto</span>
                                                        <span>{budget > 0 ? fmt(budget) : '—'}</span>
                                                    </div>
                                                </div>
                                                {hasData && (
                                                    <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#a81d24]">
                                                        Ver detalle
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="hidden overflow-x-auto custom-scrollbar md:block">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left border-b-2 border-[#ead5c5]">
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500">Categoría</th>
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500 text-right">Real</th>
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500 text-right">Presupuesto</th>
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500 text-right">Ejec.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {finalExpenseRows.map(([category, amount]) => {
                                                const budget = currentBudgets[category] || 0;
                                                const execPercent = budget > 0 ? (amount / budget) * 100 : 0;
                                                const hasData = amount > 0;

                                                return (
                                                    <tr
                                                        key={category}
                                                        className={`transition-colors ${hasData ? 'cursor-pointer hover:bg-[#fff8f5]' : 'opacity-60'}`}
                                                        onClick={() => hasData && setModalCategory(category)}
                                                    >
                                                        <td className="py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${hasData ? 'bg-[#fff0f0]' : 'bg-stone-100'}`}>
                                                                    <Icon
                                                                        path={Icons.receipt}
                                                                        className={`w-3 h-3 ${hasData ? 'text-[#a81d24]' : 'text-stone-400'}`}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-stone-700 text-sm uppercase">{category}</div>
                                                                    {!hasData && (
                                                                        <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500 font-medium">Sin movimientos</span>
                                                                    )}
                                                                    {hasData && (
                                                                        <div className="text-[10px] text-[#a81d24] font-semibold">Ver detalle →</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <div className="font-bold text-stone-800 text-sm">{fmt(amount)}</div>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <div className="text-stone-500 text-sm font-medium">
                                                                {budget > 0 ? fmt(budget) : '—'}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            {budget > 0 ? (
                                                                <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                                                                    execPercent > 100
                                                                        ? 'bg-rose-100 text-rose-700'
                                                                        : execPercent > 80
                                                                            ? 'bg-amber-100 text-amber-700'
                                                                            : 'bg-emerald-100 text-emerald-700'
                                                                }`}>
                                                                    {execPercent.toFixed(1)}%
                                                                </div>
                                                            ) : (
                                                                <span className="text-stone-400">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-[#7f1218] bg-stone-50">
                                                <td className="py-3 pl-2">
                                                    <div className="font-bold text-stone-800 uppercase text-xs tracking-wider">Total Operativo</div>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="font-black text-stone-800 text-sm">{fmt(totalExpenses)}</div>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="font-bold text-stone-600 text-sm">{fmt(totalBudgetLimit)}</div>
                                                </td>
                                                <td className="py-3 text-right pr-1">
                                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black ${
                                                        totalExecution > 100
                                                            ? 'bg-rose-600 text-white'
                                                            : totalExecution > 90
                                                                ? 'bg-amber-500 text-white'
                                                                : 'bg-emerald-600 text-white'
                                                    }`}>
                                                        {totalExecution.toFixed(1)}%
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Barra presupuesto */}
                                {totalBudgetLimit > 0 && (
                                    <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Ejecución del Presupuesto Total</span>
                                            <span className={`text-sm font-black ${totalExecution > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {totalExecution.toFixed(1)}% utilizado
                                            </span>
                                        </div>
                                        <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    totalExecution > 100 ? 'bg-rose-500' : totalExecution > 90 ? 'bg-amber-500' : 'bg-[#a81d24]'
                                                }`}
                                                style={{ width: `${Math.min(totalExecution, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
