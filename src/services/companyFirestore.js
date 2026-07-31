import { collection, doc } from 'firebase/firestore';
import { AMPARITO_COMPANY_ID, DEFAULT_COMPANY, getCompanyById } from './companies';

const resolveCompany = (company) => getCompanyById(company?.id || company || DEFAULT_COMPANY.id);

export const isLegacyCompany = (company) => (
    resolveCompany(company).id === AMPARITO_COMPANY_ID
);

export const companyCollection = (db, company, collectionName) => {
    const resolvedCompany = resolveCompany(company);
    if (isLegacyCompany(resolvedCompany)) return collection(db, collectionName);
    return collection(db, 'empresas', resolvedCompany.id, collectionName);
};

export const companyDoc = (db, company, collectionName, id) => {
    const resolvedCompany = resolveCompany(company);
    if (isLegacyCompany(resolvedCompany)) return doc(db, collectionName, id);
    return doc(db, 'empresas', resolvedCompany.id, collectionName, id);
};

export const companyConfigDoc = (db, company, configId) => {
    const resolvedCompany = resolveCompany(company);
    if (isLegacyCompany(resolvedCompany)) return doc(db, 'configuracion', configId);
    return doc(db, 'empresas', resolvedCompany.id, 'configuracion', configId);
};
