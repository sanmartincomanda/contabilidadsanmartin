export const AMPARITO_COMPANY_ID = 'carnes_amparito';
export const MASAYA_COMPANY_ID = 'carnes_san_martin_masaya';

export const COMPANIES = [
    {
        id: AMPARITO_COMPANY_ID,
        name: 'Carnes Amparito',
        legalName: 'CARNES AMPARITO',
        branchId: 'amparito',
        branchName: 'CARNES AMPARITO',
        logo: '/amparito-logo.jpeg',
        dataMode: 'legacy',
    },
    {
        id: MASAYA_COMPANY_ID,
        name: 'Carnes San Martin Masaya',
        legalName: 'CARNES SAN MARTIN MASAYA',
        branchId: 'san_martin_masaya',
        branchName: 'CARNES SAN MARTIN MASAYA',
        logo: '/logo.png',
        dataMode: 'scoped',
    },
];

const MULTI_COMPANY_EMAILS = new Set([
    'luis.s.97@hotmail.com',
]);

export const DEFAULT_COMPANY = COMPANIES[0];

export const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

export const getCompanyById = (companyId) => (
    COMPANIES.find((company) => company.id === companyId) || DEFAULT_COMPANY
);

export const getAllowedCompaniesForEmail = (email) => {
    const normalizedEmail = normalizeEmail(email);
    if (MULTI_COMPANY_EMAILS.has(normalizedEmail)) return COMPANIES;
    return [DEFAULT_COMPANY];
};

export const canAccessCompany = (email, companyId) => (
    getAllowedCompaniesForEmail(email).some((company) => company.id === companyId)
);
