import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ element }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-[55vh] items-center justify-center px-4 py-10">
                <div className="erp-panel w-full max-w-md rounded-[26px] px-8 py-10 text-center">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#60717e]">Secure access</div>
                    <div className="mt-2 text-2xl font-extrabold text-[#16222d]">Validando sesion</div>
                    <div className="mt-2 text-sm text-[#6c8794]">Preparando el modulo solicitado.</div>
                </div>
            </div>
        );
    }

    if (user) return element;

    return <Navigate to="/login" replace />;
}
