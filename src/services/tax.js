import {
    AMPARITO_COMPANY_ID,
    DEFAULT_COMPANY,
    MASAYA_COMPANY_ID,
} from './companies';

const FIXED_MONTHLY_TAX_BY_COMPANY = Object.freeze({
    [AMPARITO_COMPANY_ID]: 3000,
    [MASAYA_COMPANY_ID]: 500,
});

const resolveCompanyId = (company) => (
    typeof company === 'string' ? company : company?.id
);

export const getFixedMonthlyTax = (company = DEFAULT_COMPANY) => (
    FIXED_MONTHLY_TAX_BY_COMPANY[resolveCompanyId(company)]
    ?? FIXED_MONTHLY_TAX_BY_COMPANY[DEFAULT_COMPANY.id]
);

export const calculateFixedQuotaTaxes = (
    operatingProfit = 0,
    depreciation = 0,
    company = DEFAULT_COMPANY,
    monthCount = 1,
) => {
    const safeOperatingProfit = Number(operatingProfit) || 0;
    const safeDepreciation = Math.max(Number(depreciation) || 0, 0);
    const coveredMonths = Math.max(Math.trunc(Number(monthCount) || 1), 1);
    const monthlyQuota = getFixedMonthlyTax(company);
    const imi = 0;
    const totalTax = monthlyQuota * coveredMonths;
    const netProfit = safeOperatingProfit - safeDepreciation - totalTax;

    return {
        regime: 'fixed_quota',
        monthlyQuota,
        coveredMonths,
        imi,
        totalTax,
        netProfit,
    };
};
