import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
    DEFAULT_COMPANY,
    getAllowedCompaniesForEmail,
    getCompanyById,
} from '../services/companies';

const CompanyContext = createContext();
const STORAGE_KEY = 'activeCompanyId';

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }) => {
    const { user } = useAuth();
    const allowedCompanies = useMemo(
        () => getAllowedCompaniesForEmail(user?.email),
        [user?.email]
    );
    const [activeCompanyId, setActiveCompanyId] = useState(() => (
        localStorage.getItem(STORAGE_KEY) || DEFAULT_COMPANY.id
    ));

    useEffect(() => {
        const nextCompany = allowedCompanies.some((company) => company.id === activeCompanyId)
            ? activeCompanyId
            : allowedCompanies[0]?.id || DEFAULT_COMPANY.id;

        if (nextCompany !== activeCompanyId) {
            setActiveCompanyId(nextCompany);
            return;
        }

        localStorage.setItem(STORAGE_KEY, nextCompany);
    }, [activeCompanyId, allowedCompanies]);

    const value = useMemo(() => {
        const activeCompany = getCompanyById(activeCompanyId);
        return {
            activeCompany,
            activeCompanyId,
            allowedCompanies,
            canSwitchCompany: allowedCompanies.length > 1,
            setActiveCompanyId,
        };
    }, [activeCompanyId, allowedCompanies]);

    return (
        <CompanyContext.Provider value={value}>
            {children}
        </CompanyContext.Provider>
    );
};
