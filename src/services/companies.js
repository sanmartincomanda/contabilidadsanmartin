export const AMPARITO_COMPANY_ID = 'carnes_amparito';
export const MASAYA_COMPANY_ID = 'carnes_san_martin_masaya';

export const EXPENSE_CAPTURE_USERS = {
    masaya: {
        username: 'masaya',
        email: 'masaya@sanmartinsr.com',
        companyId: MASAYA_COMPANY_ID,
        displayName: 'Captura Masaya',
    },
    amparito: {
        username: 'amparito',
        email: 'amparito@sanmartinsr.com',
        companyId: AMPARITO_COMPANY_ID,
        displayName: 'Captura Amparito',
    },
};

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

const MASAYA_ONLY_EMAILS = new Set([
    'bryansaenz9@hotmail.com',
    EXPENSE_CAPTURE_USERS.masaya.email,
]);

const EXPENSE_CAPTURE_EMAILS = new Map(
    Object.values(EXPENSE_CAPTURE_USERS).map((captureUser) => [captureUser.email, captureUser])
);

export const DEFAULT_COMPANY = COMPANIES[0];

export const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

export const resolveLoginEmail = (identifier = '') => {
    const normalizedIdentifier = normalizeEmail(identifier);
    return EXPENSE_CAPTURE_USERS[normalizedIdentifier]?.email || normalizedIdentifier;
};

export const getExpenseCaptureUser = (email = '') => (
    EXPENSE_CAPTURE_EMAILS.get(normalizeEmail(email)) || null
);

export const isExpenseCaptureEmail = (email = '') => Boolean(getExpenseCaptureUser(email));

export const getCompanyById = (companyId) => (
    COMPANIES.find((company) => company.id === companyId) || DEFAULT_COMPANY
);

export const getAllowedCompaniesForEmail = (email) => {
    const normalizedEmail = normalizeEmail(email);
    const captureUser = getExpenseCaptureUser(normalizedEmail);
    if (captureUser) return [getCompanyById(captureUser.companyId)];
    if (MULTI_COMPANY_EMAILS.has(normalizedEmail)) return COMPANIES;
    if (MASAYA_ONLY_EMAILS.has(normalizedEmail)) return [getCompanyById(MASAYA_COMPANY_ID)];
    return [DEFAULT_COMPANY];
};

export const canAccessCompany = (email, companyId) => (
    getAllowedCompaniesForEmail(email).some((company) => company.id === companyId)
);
