import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_COMPANY, getAllowedCompaniesForEmail, resolveLoginEmail } from '../services/companies';

const Icon = ({ children, className = 'h-5 w-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {children}
    </svg>
);

export default function MobileExpenseLogin() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const company = getAllowedCompaniesForEmail(resolveLoginEmail(username))[0] || DEFAULT_COMPANY;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
        } catch (loginError) {
            console.error('Error de acceso a captura:', loginError);
            setError('Usuario o contrasena incorrectos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mobile-expense-page mobile-expense-login-page">
            <section className="mobile-expense-login-card">
                <div className="mobile-expense-login-brand">
                    <div className="mobile-expense-login-logo-wrap">
                        <img src={company.logo || DEFAULT_COMPANY.logo} alt="" />
                    </div>
                    <div>
                        <div className="mobile-expense-eyebrow">CSM Contabilidad</div>
                        <h1>Captura de gastos</h1>
                        <p>Acceso rapido por sucursal</p>
                    </div>
                </div>

                <div className="mobile-expense-login-body">
                    <div className="mobile-expense-security-note">
                        <Icon className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.6-4" />
                        </Icon>
                        Cada usuario registra unicamente en su empresa.
                    </div>

                    <form onSubmit={handleSubmit} className="mobile-expense-login-form">
                        <label htmlFor="capture-username">Usuario</label>
                        <div className="mobile-expense-input-shell">
                            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0" /></Icon>
                            <input
                                id="capture-username"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                placeholder="Ej: masaya"
                                autoComplete="username"
                                autoCapitalize="none"
                                required
                                disabled={loading}
                            />
                        </div>

                        <label htmlFor="capture-password">Contrasena</label>
                        <div className="mobile-expense-input-shell">
                            <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Zm6 4v2" /></Icon>
                            <input
                                id="capture-password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Ingrese su contrasena"
                                autoComplete="current-password"
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && <div className="mobile-expense-login-error">{error}</div>}

                        <button type="submit" className="mobile-expense-primary-button" disabled={loading}>
                            {loading ? 'Validando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}
