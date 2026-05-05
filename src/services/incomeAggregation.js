const normalizeDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.substring(0, 10);
    if (value?.toDate) return value.toDate().toISOString().substring(0, 10);
    if (value instanceof Date) return value.toISOString().substring(0, 10);
    return '';
};

const normalizeSource = (value) => value === 'sicar' ? 'sicar' : 'manual';
const normalizeAmount = (value) => Number(value ?? 0) || 0;

export const getIncomeDate = (income) => normalizeDate(income?.date || income?.fecha || income?.timestamp);
export const getIncomeAmount = (income) => normalizeAmount(income?.amount ?? income?.monto ?? income?.total);

export const resolveIncomeEntries = (ingresos = []) => {
    const groupedByDate = new Map();

    ingresos.forEach((income) => {
        const date = getIncomeDate(income);
        if (!date) return;

        const source = normalizeSource(income.source);
        const normalizedIncome = {
            ...income,
            date,
            amount: getIncomeAmount(income),
            source,
        };

        if (!groupedByDate.has(date)) {
            groupedByDate.set(date, []);
        }

        groupedByDate.get(date).push(normalizedIncome);
    });

    return Array.from(groupedByDate.values()).flatMap((items) => {
        const sicarItems = items.filter((item) => item.source === 'sicar');
        return sicarItems.length > 0 ? sicarItems : items;
    });
};

export const sumIncomeForMonth = (ingresos = [], month) => {
    if (!month) return 0;

    return resolveIncomeEntries(ingresos)
        .filter((income) => income.date?.startsWith(month))
        .reduce((total, income) => total + income.amount, 0);
};
