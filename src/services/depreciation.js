import { peso } from '../constants';

const normalizeMonthValue = (value = '') => {
    if (!value) return '';
    const stringValue = String(value);
    if (/^\d{4}-\d{2}$/.test(stringValue)) return stringValue;
    if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) return stringValue.substring(0, 7);
    return '';
};

const monthToIndex = (value = '') => {
    const month = normalizeMonthValue(value);
    if (!month) return null;
    const [year, rawMonth] = month.split('-').map(Number);
    if (!year || !rawMonth) return null;
    return (year * 12) + (rawMonth - 1);
};

export const getDepreciationMonths = (item = {}) => {
    const years = Number(item.usefulLifeYears ?? item.years ?? 0);
    if (!Number.isFinite(years) || years <= 0) return 0;
    return Math.round(years * 12);
};

export const getMonthlyDepreciationAmount = (item = {}) => {
    const amount = peso(item.amount ?? item.monto);
    const totalMonths = getDepreciationMonths(item);
    if (!amount || !totalMonths) return 0;
    return amount / totalMonths;
};

export const isDepreciationActiveForMonth = (item = {}, targetMonth = '') => {
    const startIndex = monthToIndex(item.depreciateFrom || item.startDate || item.month);
    const targetIndex = monthToIndex(targetMonth);
    const totalMonths = getDepreciationMonths(item);

    if (startIndex === null || targetIndex === null || !totalMonths) return false;
    return targetIndex >= startIndex && targetIndex < (startIndex + totalMonths);
};

export const calculateDepreciationExpenseForMonth = (items = [], targetMonth = '') => (
    items.reduce((sum, item) => (
        sum + (isDepreciationActiveForMonth(item, targetMonth) ? getMonthlyDepreciationAmount(item) : 0)
    ), 0)
);

export const getDepreciationEndMonth = (item = {}) => {
    const startIndex = monthToIndex(item.depreciateFrom || item.startDate || item.month);
    const totalMonths = getDepreciationMonths(item);

    if (startIndex === null || !totalMonths) return '';

    const endIndex = startIndex + totalMonths - 1;
    const year = Math.floor(endIndex / 12);
    const month = String((endIndex % 12) + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export const getDepreciationActiveMonths = (item = {}) => {
    const startIndex = monthToIndex(item.depreciateFrom || item.startDate || item.month);
    const totalMonths = getDepreciationMonths(item);

    if (startIndex === null || !totalMonths) return [];

    return Array.from({ length: totalMonths }, (_, offset) => {
        const index = startIndex + offset;
        const year = Math.floor(index / 12);
        const month = String((index % 12) + 1).padStart(2, '0');
        return `${year}-${month}`;
    });
};
