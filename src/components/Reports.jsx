// src/components/Reports.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { fmt, peso, branchName, resolveBranchId } from '../constants';
import { calculateDepreciationExpenseForMonth, getDepreciationActiveMonths } from '../services/depreciation';
import { calculateGeneralRegimeTaxes } from '../services/tax';
import BalanceSheet from './BalanceSheet';
import DashboardGeneral from './DashboardGeneral';
import { resolveReportIncomeEntries } from '../services/incomeAggregation';
import { getExpenseCategoryKey, inferPurchaseSubcategory, normalizeExpenseClassification } from '../services/expenseCategories';
import { getLocalDateString, getLocalMonthString } from '../utils/localDate';

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
    printer: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
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

const splitExpenseCategoryKey = (categoryKey = '') => {
    const separatorIndex = categoryKey.lastIndexOf(' / ');
    return {
        mainCategory: separatorIndex >= 0 ? categoryKey.slice(0, separatorIndex) : categoryKey,
        subcategory: separatorIndex >= 0 ? categoryKey.slice(separatorIndex + 3) : 'Sin subcategoria',
    };
};

const getDateString = (value, fallback = '') => {
    if (typeof value === 'string') return value.substring(0, 10);
    if (value?.toDate) return value.toDate().toISOString().substring(0, 10);
    if (value instanceof Date) return value.toISOString().substring(0, 10);
    return fallback;
};

const isDateInRange = (dateString, startDate, endDate) => (
    Boolean(dateString && startDate && endDate && dateString >= startDate && dateString <= endDate)
);

const getMonthEndDate = (month = '') => {
    if (!/^\d{4}-\d{2}$/.test(month)) return getLocalDateString();
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    return `${month}-${String(lastDay).padStart(2, '0')}`;
};

const getMonthStartDate = (month = '') => (
    /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : getLocalDateString()
);

const formatPeriodLabel = ({ mode, month, startDate, endDate }) => (
    mode === 'monthly'
        ? `Mes fiscal ${month}`
        : `Del ${startDate} al ${endDate}`
);

const getMonthsBetweenDates = (startDate, endDate) => {
    if (!startDate || !endDate) return [];
    const [startYear, startMonth] = startDate.substring(0, 7).split('-').map(Number);
    const [endYear, endMonth] = endDate.substring(0, 7).split('-').map(Number);
    const startIndex = (startYear * 12) + (startMonth - 1);
    const endIndex = (endYear * 12) + (endMonth - 1);
    if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex) || endIndex < startIndex) return [];

    return Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => {
        const index = startIndex + offset;
        const year = Math.floor(index / 12);
        const month = String((index % 12) + 1).padStart(2, '0');
        return `${year}-${month}`;
    });
};

const countOverlapDays = (startDate, endDate, month) => {
    const monthStart = getMonthStartDate(month);
    const monthEnd = getMonthEndDate(month);
    const effectiveStart = startDate > monthStart ? startDate : monthStart;
    const effectiveEnd = endDate < monthEnd ? endDate : monthEnd;
    if (effectiveEnd < effectiveStart) return 0;

    const start = new Date(`${effectiveStart}T12:00:00`);
    const end = new Date(`${effectiveEnd}T12:00:00`);
    return Math.round((end - start) / 86400000) + 1;
};

const calculateDepreciationExpenseForRange = (items = [], startDate, endDate) => (
    getMonthsBetweenDates(startDate, endDate).reduce((sum, month) => {
        const daysInMonth = Number(getMonthEndDate(month).substring(8, 10));
        const overlapDays = countOverlapDays(startDate, endDate, month);
        if (!daysInMonth || !overlapDays) return sum;
        return sum + (calculateDepreciationExpenseForMonth(items, month) * (overlapDays / daysInMonth));
    }, 0)
);

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
                    subtitle={topCategory ? `${topCategory.mainCategory} / ${topCategory.subcategory}` : 'Sin datos'}
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
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Categoria / Subcategoria</div>
                                    <div className="mt-1 text-sm font-black uppercase text-[#182b36]">{row.mainCategory}</div>
                                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7f8c]">{row.subcategory}</div>
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
const FiscalReport = ({
    report,
    mode,
    month,
    startDate,
    endDate,
    onModeChange,
    onMonthChange,
    onStartDateChange,
    onEndDateChange,
    onExportPdf,
}) => {
    const margin = (value) => report.totalIncome > 0 ? `${((value / report.totalIncome) * 100).toFixed(1)}%` : '0.0%';
    const expenseCategoryRows = report.groupedExpenses.flatMap((group) => ([
        {
            key: group.category,
            label: group.category,
            value: group.amount,
            margin: margin(group.amount),
            isGroup: true,
        },
        ...group.subcategories.map((item) => ({
            key: item.key,
            label: item.subcategory,
            parent: group.category,
            value: item.amount,
            margin: margin(item.amount),
            isSubcategory: true,
        })),
    ]));
    const fiscalRows = [
        { label: 'Ingresos netos', value: report.totalIncome, tone: 'income', margin: margin(report.totalIncome) },
        {
            label: 'Costo de venta',
            value: report.totalCOGS,
            tone: 'cost',
            margin: margin(report.totalCOGS),
            children: [
                ...report.purchaseBreakdown.map((item) => ({
                    label: item.subcategory,
                    value: item.amount,
                    margin: margin(item.amount),
                })),
                ...(report.usesInventoryAdjustment ? [
                    { label: 'Inventario inicial', value: report.initialInventory, margin: margin(report.initialInventory) },
                    { label: 'Inventario final', value: -report.finalInventory, margin: margin(-report.finalInventory) },
                    { label: 'Ajuste inventario', value: report.inventoryAdjustment, margin: margin(report.inventoryAdjustment) },
                ] : []),
            ],
        },
        { label: 'Utilidad bruta', value: report.grossProfit, tone: 'subtotal', margin: margin(report.grossProfit) },
        {
            label: 'Gastos operativos',
            value: report.totalExpenses,
            tone: 'cost',
            margin: margin(report.totalExpenses),
            children: expenseCategoryRows,
        },
        {
            label: 'EBITDA',
            value: report.ebitda,
            tone: 'subtotal',
            margin: margin(report.ebitda),
        },
        ...(report.depreciation > 0 ? [{ label: 'Depreciaciones', value: report.depreciation, tone: 'cost', margin: margin(report.depreciation) }] : []),
        {
            label: 'Impuesto',
            value: report.totalTax,
            tone: 'cost',
            margin: margin(report.totalTax),
            children: [
                { label: 'IMI 1% sobre ingresos', value: report.imi, margin: margin(report.imi) },
                { label: 'IR 30% sobre base imponible', value: report.ir, margin: margin(report.ir) },
            ],
        },
        { label: 'Utilidad neta fiscal', value: report.netProfit, tone: 'net', margin: margin(report.netProfit) },
    ];

    const amountTone = (tone) => {
        if (tone === 'cost') return 'text-[#a81d24]';
        if (tone === 'income') return 'text-[#1e7a4f]';
        return '';
    };

    return (
        <div className="animate-fade-in space-y-5">
            <Card title="Reporte Fiscal" subtitle="Estado de resultado membretado para PDF" icon="receipt">
                <div className="fiscal-no-print grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr_auto] lg:items-end">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tipo de periodo</div>
                        <div className="mt-2 grid grid-cols-2 rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] p-1">
                            {[
                                ['monthly', 'Mensual'],
                                ['range', 'Intervalo'],
                            ].map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => onModeChange(value)}
                                    className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                                        mode === value ? 'bg-[#152533] text-white shadow-sm' : 'text-[#55717f] hover:bg-white'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'monthly' ? (
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Mes fiscal</label>
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => onMonthChange(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-bold text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Desde</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => onStartDateChange(e.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-bold text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Hasta</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => onEndDateChange(e.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-bold text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onExportPdf}
                        className="erp-pressable flex items-center justify-center gap-2 rounded-2xl bg-[#152533] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_24px_-18px_rgba(15,23,42,.9)] transition hover:bg-[#1f3548]"
                    >
                        <Icon path={Icons.printer} className="h-4 w-4" />
                        Exportar PDF
                    </button>
                </div>
            </Card>

            <section className="fiscal-report-print overflow-hidden rounded-[20px] border border-[#d7e2e9] bg-white shadow-[0_22px_50px_-36px_rgba(15,23,42,.45)]">
                <div className="border-b-[5px] border-[#a81d24] bg-white px-5 py-4 text-[#173042]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <img src="/amparito-logo.jpeg" alt="Carnes Amparito" className="h-14 w-14 rounded-xl border border-[#d7e2e9] bg-white object-contain p-1 shadow-sm" />
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-[0.34em] text-[#7a919d]">Reporte Fiscal</div>
                                <h2 className="mt-0.5 text-2xl font-black tracking-tight">Carnes Amparito</h2>
                                <p className="text-xs font-semibold text-[#6d8390]">Estado de Resultado Fiscal y Gerencial</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-[#d7e2e9] bg-[#f7fbfd] px-4 py-2.5 text-right">
                            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#7a919d]">Periodo</div>
                            <div className="mt-0.5 text-sm font-black">{report.periodLabel}</div>
                            <div className="mt-0.5 text-[10px] font-semibold text-[#7a919d]">Generado: {report.generatedAt}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-b border-[#d7e2e9] bg-[#f7fbfd] px-5 py-3 md:grid-cols-4">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6d8390]">Ingresos</div>
                        <div className="mt-0.5 text-base font-black text-[#173042]">{fmt(report.totalIncome)}</div>
                    </div>
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6d8390]">Costo venta</div>
                        <div className="mt-0.5 text-base font-black text-[#a81d24]">{fmt(report.totalCOGS)}</div>
                    </div>
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6d8390]">Gastos operativos</div>
                        <div className="mt-0.5 text-base font-black text-[#a81d24]">{fmt(report.totalExpenses)}</div>
                    </div>
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6d8390]">Utilidad neta</div>
                        <div className={`mt-0.5 text-base font-black ${report.netProfit >= 0 ? 'text-[#1e7a4f]' : 'text-[#a81d24]'}`}>{fmt(report.netProfit)}</div>
                    </div>
                </div>

                <div className="px-5 py-5">
                    <div className="overflow-hidden rounded-2xl border border-[#d7e2e9]">
                        <div className="border-b border-[#d7e2e9] bg-[#f7fbfd] px-4 py-2.5">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5d7784]">Estado de resultado fiscal</div>
                        </div>
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-[#d7e2e9] text-left text-[9px] font-black uppercase tracking-[0.16em] text-[#6d8390]">
                                    <th className="px-4 py-2.5">Concepto</th>
                                    <th className="px-4 py-2.5 text-right">Monto</th>
                                    <th className="px-4 py-2.5 text-right">% ingreso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fiscalRows.map((row) => (
                                    <React.Fragment key={row.label}>
                                        <tr className={`border-b border-[#eef3f6] ${
                                            row.tone === 'net'
                                                ? 'bg-[#152533] text-white'
                                                : row.tone === 'subtotal'
                                                    ? 'bg-[#eef8f0] text-[#173042]'
                                                    : ''
                                        }`}>
                                            <td className="px-4 py-2.5 font-black uppercase">{row.label}</td>
                                            <td className={`px-4 py-2.5 text-right font-black ${amountTone(row.tone)}`}>{fmt(row.value)}</td>
                                            <td className="px-4 py-2.5 text-right font-bold">{row.margin}</td>
                                        </tr>
                                        {row.children?.map((child) => (
                                            <tr
                                                key={`${row.label}-${child.key || child.label}-${child.value}`}
                                                className={`border-b border-[#f2f5f7] text-[11px] ${
                                                    child.isGroup
                                                        ? 'bg-[#f3f8fb] text-[#173042]'
                                                        : 'bg-[#fbfdfe] text-[#5d7784]'
                                                }`}
                                            >
                                                <td className={`${child.isGroup ? 'px-6' : 'px-10'} py-1.5`}>
                                                    <div className={`${child.isGroup ? 'font-black' : 'font-bold'} uppercase`}>
                                                        {child.isSubcategory && <span className="mr-1.5 text-[#a81d24]">-</span>}
                                                        {child.label}
                                                    </div>
                                                </td>
                                                <td className={`${child.isGroup ? 'font-black text-[#173042]' : 'font-bold'} px-4 py-1.5 text-right`}>{fmt(child.value)}</td>
                                                <td className={`${child.isGroup ? 'font-black text-[#173042]' : 'font-semibold'} px-4 py-1.5 text-right`}>{child.margin || '-'}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.2fr]">
                        <div className="rounded-2xl border border-[#d7e2e9] bg-[#fbfdfe] p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5d7784]">Base fiscal</div>
                            <div className="mt-3 grid gap-2 text-[12px]">
                                <div className="flex justify-between gap-4"><span className="font-semibold text-[#5d7784]">Base IR</span><span className="font-black text-[#173042]">{fmt(report.irBase)}</span></div>
                                <div className="flex justify-between gap-4"><span className="font-semibold text-[#5d7784]">EBITDA</span><span className="font-black text-[#173042]">{fmt(report.ebitda)}</span></div>
                                <div className="flex justify-between gap-4"><span className="font-semibold text-[#5d7784]">IMI 1%</span><span className="font-black text-[#a81d24]">{fmt(report.imi)}</span></div>
                                <div className="flex justify-between gap-4"><span className="font-semibold text-[#5d7784]">IR 30%</span><span className="font-black text-[#a81d24]">{fmt(report.ir)}</span></div>
                                <div className="border-t border-[#d7e2e9] pt-2">
                                    <div className="flex justify-between gap-4"><span className="font-black uppercase text-[#173042]">Total impuesto</span><span className="font-black text-[#a81d24]">{fmt(report.totalTax)}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#d7e2e9] bg-white p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5d7784]">Notas del reporte</div>
                            <div className="mt-2 space-y-1 text-[10px] font-semibold leading-snug text-[#667b87]">
                                <p>Moneda expresada en cordobas nicaraguenses (C$).</p>
                                <p>EBITDA representa la utilidad antes de impuestos, depreciacion y amortizaciones. IMI calculado automaticamente al 1% de ingresos. IR calculado al 30% sobre EBITDA menos IMI y depreciacion.</p>
                                {!report.usesInventoryAdjustment && (
                                    <p>Para intervalos, el costo de venta se basa en compras del periodo; el ajuste de inventario aplica en reporte mensual completo.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 border-t border-[#d7e2e9] px-6 py-6 text-xs text-[#5d7784] md:grid-cols-2">
                    <div>
                        <div className="h-12 border-b border-[#9fb7c4]" />
                        <div className="mt-2 font-black uppercase tracking-[0.18em]">Elaborado por</div>
                        <div className="mt-1 font-semibold">Sistema Contable Carnes Amparito</div>
                    </div>
                    <div>
                        <div className="h-12 border-b border-[#9fb7c4]" />
                        <div className="mt-2 font-black uppercase tracking-[0.18em]">Revisado / Autorizado</div>
                        <div className="mt-1 font-semibold">Administracion</div>
                    </div>
                </div>
            </section>
        </div>
    );
};

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
        const categoryKey = getExpenseCategoryKey(p);
        acc[p.month] = acc[p.month] || {};
        acc[p.month][categoryKey] = (acc[p.month][categoryKey] || 0) + peso(p.amount);
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
            const classification = normalizeExpenseClassification(item);
            const categoryKey = `${classification.category} / ${classification.subcategory}`;
            branchData.totalExpense += peso(item.amount ?? item.monto);
            branchData.expenseDetails[categoryKey] = (branchData.expenseDetails[categoryKey] || 0) + peso(item.amount ?? item.monto);
            branchData.rawExpenses.push({
                ...item,
                category: classification.category,
                subcategory: classification.subcategory,
                categoryKey,
                dateStr: dateString,
                amount: peso(item.amount ?? item.monto),
            });
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

const buildGroupedExpenseBreakdown = (expenseDetails = {}) => (
    Object.entries(expenseDetails)
        .reduce((groups, [categoryKey, amount]) => {
            const { mainCategory, subcategory } = splitExpenseCategoryKey(categoryKey);
            if (!groups.has(mainCategory)) {
                groups.set(mainCategory, {
                    category: mainCategory,
                    amount: 0,
                    subcategories: [],
                });
            }

            const group = groups.get(mainCategory);
            group.amount += amount;
            group.subcategories.push({
                key: categoryKey,
                subcategory,
                amount,
            });

            return groups;
        }, new Map())
);

const buildFiscalReportData = (data = {}, period = {}) => {
    const { ingresos = [], gastos = [], compras = [], cuentas_por_pagar: facturasCredito = [], inventarios = [], depreciaciones = [] } = data;
    const { mode = 'monthly', month = getLocalMonthString(), startDate, endDate } = period;
    const safeStartDate = mode === 'monthly' ? getMonthStartDate(month) : startDate;
    const safeEndDate = mode === 'monthly' ? getMonthEndDate(month) : endDate;
    const reportMonth = safeStartDate?.substring(0, 7);
    const isMonthlyInventoryPeriod = mode === 'monthly' && reportMonth === safeEndDate?.substring(0, 7);

    const mirroredFacturaIds = new Set(
        compras
            .map((item) => item.sourceFacturaId || item.linkedPayableId || (item.id?.startsWith('credito_') ? item.id.replace('credito_', '') : ''))
            .filter(Boolean)
    );

    const totalIncome = resolveReportIncomeEntries(ingresos)
        .filter((income) => isDateInRange(income.date, safeStartDate, safeEndDate))
        .reduce((sum, income) => sum + peso(income.amount), 0);

    const expenseDetails = {};
    const costDetails = {};
    const addCostDetail = (item, amount) => {
        const key = inferPurchaseSubcategory(item);
        costDetails[key] = (costDetails[key] || 0) + amount;
    };

    const totalExpenses = gastos.reduce((sum, item) => {
        const dateString = getDateString(item.date || item.fecha || item.timestamp);
        if (!isDateInRange(dateString, safeStartDate, safeEndDate)) return sum;

        const classification = normalizeExpenseClassification(item);
        const categoryKey = `${classification.category} / ${classification.subcategory}`;
        const amount = peso(item.amount ?? item.monto);
        expenseDetails[categoryKey] = (expenseDetails[categoryKey] || 0) + amount;
        return sum + amount;
    }, 0);

    const cashPurchases = compras.reduce((sum, item) => {
        const dateString = getDateString(item.date || item.fecha || item.timestamp);
        if (!isDateInRange(dateString, safeStartDate, safeEndDate)) return sum;
        const amount = peso(item.amount ?? item.monto);
        addCostDetail(item, amount);
        return sum + amount;
    }, 0);

    const creditPurchases = facturasCredito.reduce((sum, item) => {
        if (item.id && mirroredFacturaIds.has(item.id)) return sum;
        const dateString = getDateString(item.fecha || item.date || item.timestamp);
        if (!isDateInRange(dateString, safeStartDate, safeEndDate)) return sum;
        const amount = peso(item.monto ?? item.amount);
        addCostDetail(item, amount);
        return sum + amount;
    }, 0);

    const initialInventory = isMonthlyInventoryPeriod
        ? inventarios
            .filter((item) => (item.month || item.mes) === reportMonth && item.type === 'inicial')
            .reduce((sum, item) => sum + peso(item.amount ?? item.monto), 0)
        : 0;

    const finalInventory = isMonthlyInventoryPeriod
        ? inventarios
            .filter((item) => (item.month || item.mes) === reportMonth && item.type === 'final')
            .reduce((sum, item) => sum + peso(item.amount ?? item.monto), 0)
        : 0;

    const inventoryAdjustment = initialInventory - finalInventory;
    const totalPurchases = cashPurchases + creditPurchases;
    const totalCOGS = totalPurchases + inventoryAdjustment;
    const grossProfit = totalIncome - totalCOGS;
    const operatingGrossProfit = grossProfit - totalExpenses;
    const ebitda = operatingGrossProfit;
    const depreciation = calculateDepreciationExpenseForRange(depreciaciones, safeStartDate, safeEndDate);
    const taxBreakdown = calculateGeneralRegimeTaxes(totalIncome, ebitda, depreciation);
    const purchaseBreakdown = Object.entries(costDetails)
        .map(([subcategory, amount]) => ({
            key: subcategory,
            subcategory,
            amount,
            percentage: totalCOGS > 0 ? (amount / totalCOGS) * 100 : 0,
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    const groupedExpenses = Array.from(buildGroupedExpenseBreakdown(expenseDetails).values())
        .map((group) => ({
            ...group,
            percentage: totalExpenses > 0 ? (group.amount / totalExpenses) * 100 : 0,
            subcategories: group.subcategories
                .map((item) => ({
                    ...item,
                    percentage: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0,
                }))
                .sort((a, b) => b.amount - a.amount),
        }))
        .sort((a, b) => b.amount - a.amount);

    return {
        mode,
        month,
        startDate: safeStartDate,
        endDate: safeEndDate,
        periodLabel: formatPeriodLabel({ mode, month, startDate: safeStartDate, endDate: safeEndDate }),
        generatedAt: new Date().toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' }),
        totalIncome,
        cashPurchases,
        creditPurchases,
        totalPurchases,
        purchaseBreakdown,
        initialInventory,
        finalInventory,
        inventoryAdjustment,
        totalCOGS,
        grossProfit,
        totalExpenses,
        operatingGrossProfit,
        ebitda,
        depreciation,
        imi: taxBreakdown.imi,
        irBase: taxBreakdown.irBase,
        ir: taxBreakdown.ir,
        totalTax: taxBreakdown.totalTax,
        netProfit: taxBreakdown.netProfit,
        groupedExpenses,
        usesInventoryAdjustment: isMonthlyInventoryPeriod,
    };
};

export default function Reports({ data }) {
    const [activeTab, setActiveTab] = useState('Resultados');
    const [selectedMonth, setSelectedMonth] = useState(getLocalMonthString());
    const [modalCategory, setModalCategory] = useState(null);
    const [expandedExpenseCategories, setExpandedExpenseCategories] = useState(() => new Set());
    const [fiscalMode, setFiscalMode] = useState('monthly');
    const [fiscalMonth, setFiscalMonth] = useState(getLocalMonthString());
    const [fiscalStartDate, setFiscalStartDate] = useState(getMonthStartDate(getLocalMonthString()));
    const [fiscalEndDate, setFiscalEndDate] = useState(getLocalDateString());

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
        .map(([category, amount]) => {
            const { mainCategory, subcategory } = splitExpenseCategoryKey(category);

            return {
                category,
                mainCategory,
                subcategory,
                amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
            };
        })
        .filter((row) => row.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    const groupedExpenseRows = useMemo(() => {
        const groups = new Map();

        finalExpenseRows.forEach(([categoryKey, amount]) => {
            const { mainCategory, subcategory } = splitExpenseCategoryKey(categoryKey);
            const budget = currentBudgets[categoryKey] || 0;

            if (!groups.has(mainCategory)) {
                groups.set(mainCategory, {
                    category: mainCategory,
                    amount: 0,
                    budget: 0,
                    subcategories: [],
                });
            }

            const group = groups.get(mainCategory);
            group.amount += amount;
            group.budget += budget;
            group.subcategories.push({
                key: categoryKey,
                category: mainCategory,
                subcategory,
                amount,
                budget,
                execPercent: budget > 0 ? (amount / budget) * 100 : 0,
                hasData: amount > 0,
            });
        });

        return Array.from(groups.values())
            .map((group) => ({
                ...group,
                execPercent: group.budget > 0 ? (group.amount / group.budget) * 100 : 0,
                hasData: group.amount > 0,
                subcategories: group.subcategories.sort((a, b) => {
                    if (b.amount !== a.amount) return b.amount - a.amount;
                    return b.budget - a.budget;
                }),
            }))
            .sort((a, b) => {
                if (b.amount !== a.amount) return b.amount - a.amount;
                return b.budget - a.budget;
            });
    }, [finalExpenseRows, currentBudgets]);

    const toggleExpenseCategory = useCallback((category) => {
        setExpandedExpenseCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    }, []);

    const expandAllExpenseCategories = useCallback(() => {
        setExpandedExpenseCategories(new Set(groupedExpenseRows.map((group) => group.category)));
    }, [groupedExpenseRows]);

    const collapseAllExpenseCategories = useCallback(() => {
        setExpandedExpenseCategories(new Set());
    }, []);

    const fiscalPeriod = useMemo(() => {
        if (fiscalMode === 'monthly') {
            return {
                mode: 'monthly',
                month: fiscalMonth || getLocalMonthString(),
                startDate: getMonthStartDate(fiscalMonth || getLocalMonthString()),
                endDate: getMonthEndDate(fiscalMonth || getLocalMonthString()),
            };
        }

        const rawStart = fiscalStartDate || getLocalDateString();
        const rawEnd = fiscalEndDate || rawStart;
        const start = rawStart <= rawEnd ? rawStart : rawEnd;
        const end = rawStart <= rawEnd ? rawEnd : rawStart;

        return {
            mode: 'range',
            month: start.substring(0, 7),
            startDate: start,
            endDate: end,
        };
    }, [fiscalMode, fiscalMonth, fiscalStartDate, fiscalEndDate]);

    const fiscalReport = useMemo(() => (
        buildFiscalReportData(data, fiscalPeriod)
    ), [data, fiscalPeriod]);

    const handleExportFiscalPdf = useCallback(() => {
        const previousTitle = document.title;
        document.title = `Reporte Fiscal Carnes Amparito ${fiscalReport.periodLabel}`;
        window.print();
        window.setTimeout(() => {
            document.title = previousTitle;
        }, 500);
    }, [fiscalReport.periodLabel]);

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
        'Reporte Fiscal': { icon: 'printer', label: 'Reporte Fiscal' },
        'Gastos Mensuales': { icon: 'receipt', label: 'Gastos Mensuales' },
        'Ventas Mensuales': { icon: 'trendingUp', label: 'Ventas Mensuales' },
        'Balance': { icon: 'scale', label: 'Balance General' },
        'Dashboard': { icon: 'dashboard', label: 'Dashboard' }
    };

    const modalExpenses = modalCategory
        ? filteredRawExpenses.filter(item => (item.categoryKey || getExpenseCategoryKey(item)) === modalCategory)
        : [];

    return (
        <div className="space-y-5">
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f5f0ec; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #c8a898; border-radius: 3px; }
                @media print {
                    @page { size: letter portrait; margin: 7mm; }
                    html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body * { visibility: hidden !important; }
                    .fiscal-report-print, .fiscal-report-print * { visibility: visible !important; }
                    .fiscal-report-print {
                        position: absolute !important;
                        inset: 0 auto auto 0 !important;
                        width: 100% !important;
                        font-size: 10.5px !important;
                        border: 0 !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                    }
                    .fiscal-report-print table { font-size: 10.5px !important; }
                    .fiscal-report-print td, .fiscal-report-print th { padding-top: 4px !important; padding-bottom: 4px !important; }
                    .fiscal-no-print, .fiscal-no-print * { display: none !important; visibility: hidden !important; }
                    .fiscal-report-print table { page-break-inside: auto; }
                    .fiscal-report-print tr { page-break-inside: avoid; page-break-after: auto; }
                }
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

            {activeTab === 'Reporte Fiscal' && (
                <FiscalReport
                    report={fiscalReport}
                    mode={fiscalMode}
                    month={fiscalMonth}
                    startDate={fiscalStartDate}
                    endDate={fiscalEndDate}
                    onModeChange={setFiscalMode}
                    onMonthChange={setFiscalMonth}
                    onStartDateChange={setFiscalStartDate}
                    onEndDateChange={setFiscalEndDate}
                    onExportPdf={handleExportFiscalPdf}
                />
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
                                subtitle="Haz clic en una categoria para desplegar sus subcategorias"
                                icon="receipt"
                            >
                                <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={expandAllExpenseCategories}
                                        className="rounded-full border border-[#bdd5e1] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#1a6f93] transition hover:border-[#1a6f93] hover:bg-[#eef8fb]"
                                    >
                                        Expandir todo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={collapseAllExpenseCategories}
                                        className="rounded-full border border-[#ead5c5] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#a81d24] transition hover:border-[#a81d24] hover:bg-[#fff6f4]"
                                    >
                                        Colapsar todo
                                    </button>
                                </div>

                                <div className="space-y-3 md:hidden">
                                    {groupedExpenseRows.map((group) => {
                                        const isExpanded = expandedExpenseCategories.has(group.category);

                                        return (
                                            <div key={group.category} className={`erp-mobile-record overflow-hidden ${group.hasData ? '' : 'opacity-70'}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpenseCategory(group.category)}
                                                    className="erp-pressable w-full p-4 text-left"
                                                >
                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Categoria</div>
                                                            <div className="mt-1 text-sm font-black uppercase text-stone-700">{group.category}</div>
                                                            <div className="mt-1 text-[11px] font-bold text-[#7a919d]">{group.subcategories.length} subcategorias</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-bold ${
                                                                group.budget > 0
                                                                    ? group.execPercent > 100
                                                                        ? 'bg-rose-100 text-rose-700'
                                                                        : group.execPercent > 80
                                                                            ? 'bg-amber-100 text-amber-700'
                                                                            : 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {group.budget > 0 ? `${group.execPercent.toFixed(1)}%` : 'Sin presupuesto'}
                                                            </div>
                                                            <div className="rounded-full bg-[#e8f0f5] p-1.5 text-[#1a6f93]">
                                                                <Icon path={isExpanded ? Icons.chevronDown : Icons.chevronRight} className="h-3.5 w-3.5" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="erp-mobile-keyvalue">
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Total real</span>
                                                            <span className="erp-mono font-extrabold text-stone-800">{fmt(group.amount)}</span>
                                                        </div>
                                                        <div className="erp-mobile-keyvalue-row">
                                                            <span>Presupuesto</span>
                                                            <span>{group.budget > 0 ? fmt(group.budget) : '-'}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                                {isExpanded && (
                                                    <div className="border-t border-[#d9e6ed] bg-[#f8fbfd] px-4 py-3">
                                                        <div className="space-y-2">
                                                            {group.subcategories.map((item) => (
                                                                <button
                                                                    key={item.key}
                                                                    type="button"
                                                                    disabled={!item.hasData}
                                                                    onClick={() => item.hasData && setModalCategory(item.key)}
                                                                    className={`w-full rounded-xl border border-[#d9e6ed] bg-white p-3 text-left transition ${item.hasData ? 'hover:border-[#a81d24]/45 hover:bg-[#fff8f5]' : 'opacity-60'}`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <div className="text-xs font-black uppercase text-[#263842]">{item.subcategory}</div>
                                                                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a81d24]">
                                                                                {item.hasData ? 'Ver detalle' : 'Sin movimientos'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="erp-mono text-sm font-black text-stone-800">{fmt(item.amount)}</div>
                                                                            <div className="mt-1 text-[11px] font-semibold text-[#7a919d]">
                                                                                {item.budget > 0 ? fmt(item.budget) : 'Sin presupuesto'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-3 rounded-2xl border border-[#ead5c5] bg-stone-50 p-4 md:hidden">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Total Operativo</div>
                                            <div className="mt-1 text-xs font-semibold text-[#7a919d]">
                                                Presupuesto: {totalBudgetLimit > 0 ? fmt(totalBudgetLimit) : '-'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="erp-mono text-base font-black text-stone-800">{fmt(totalExpenses)}</div>
                                            <div className={`mt-1 inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-black ${
                                                totalExecution > 100
                                                    ? 'bg-rose-600 text-white'
                                                    : totalExecution > 90
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-emerald-600 text-white'
                                            }`}>
                                                {totalExecution.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden overflow-x-auto custom-scrollbar md:block">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left border-b-2 border-[#ead5c5]">
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500">Categoria</th>
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500 text-right">Real</th>
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500 text-right">Presupuesto</th>
                                                <th className="pb-3 text-xs font-bold uppercase tracking-wider text-stone-500 text-right">Ejec.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {groupedExpenseRows.map((group) => {
                                                const isExpanded = expandedExpenseCategories.has(group.category);

                                                return (
                                                    <React.Fragment key={group.category}>
                                                        <tr
                                                            className={`transition-colors ${group.hasData || group.budget > 0 ? 'cursor-pointer hover:bg-[#f5fbfd]' : 'opacity-60'}`}
                                                            onClick={() => toggleExpenseCategory(group.category)}
                                                        >
                                                            <td className="py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isExpanded ? 'bg-[#1a6f93] text-white' : 'bg-[#e8f0f5] text-[#1a6f93]'}`}>
                                                                        <Icon path={isExpanded ? Icons.chevronDown : Icons.chevronRight} className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-black text-stone-800 text-sm uppercase">{group.category}</div>
                                                                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a919d]">{group.subcategories.length} subcategorias</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 text-right">
                                                                <div className="font-black text-stone-800 text-sm">{fmt(group.amount)}</div>
                                                            </td>
                                                            <td className="py-3 text-right">
                                                                <div className="text-stone-600 text-sm font-bold">{group.budget > 0 ? fmt(group.budget) : '-'}</div>
                                                            </td>
                                                            <td className="py-3 text-right">
                                                                {group.budget > 0 ? (
                                                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                                                                        group.execPercent > 100
                                                                            ? 'bg-rose-100 text-rose-700'
                                                                            : group.execPercent > 80
                                                                                ? 'bg-amber-100 text-amber-700'
                                                                                : 'bg-emerald-100 text-emerald-700'
                                                                    }`}>
                                                                        {group.execPercent.toFixed(1)}%
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-stone-400">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && group.subcategories.map((item) => (
                                                            <tr
                                                                key={item.key}
                                                                className={`bg-[#f8fbfd] transition-colors ${item.hasData ? 'cursor-pointer hover:bg-[#fff8f5]' : 'opacity-60'}`}
                                                                onClick={() => item.hasData && setModalCategory(item.key)}
                                                            >
                                                                <td className="py-2.5 pl-10">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${item.hasData ? 'bg-[#fff0f0]' : 'bg-stone-100'}`}>
                                                                            <Icon
                                                                                path={Icons.receipt}
                                                                                className={`w-3 h-3 ${item.hasData ? 'text-[#a81d24]' : 'text-stone-400'}`}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-stone-700 text-xs uppercase">{item.subcategory}</div>
                                                                            <div className="text-[10px] text-[#a81d24] font-semibold">
                                                                                {item.hasData ? 'Ver detalle ->' : 'Sin movimientos'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 text-right">
                                                                    <div className="font-bold text-stone-800 text-sm">{fmt(item.amount)}</div>
                                                                </td>
                                                                <td className="py-2.5 text-right">
                                                                    <div className="text-stone-500 text-sm font-medium">{item.budget > 0 ? fmt(item.budget) : '-'}</div>
                                                                </td>
                                                                <td className="py-2.5 text-right">
                                                                    {item.budget > 0 ? (
                                                                        <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                                                                            item.execPercent > 100
                                                                                ? 'bg-rose-100 text-rose-700'
                                                                                : item.execPercent > 80
                                                                                    ? 'bg-amber-100 text-amber-700'
                                                                                    : 'bg-emerald-100 text-emerald-700'
                                                                        }`}>
                                                                            {item.execPercent.toFixed(1)}%
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-stone-400">-</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
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

                                <div className="hidden">
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

                                <div className="hidden">
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
