import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_COMPANY, getAllowedCompaniesForEmail } from '../services/companies';

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const loginCompany = getAllowedCompaniesForEmail(email)[0] || DEFAULT_COMPANY;
    const loginLogo = loginCompany.logo || DEFAULT_COMPANY.logo;
    const loginCompanyName = loginCompany.name || 'Sistema Contable';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (e) {
            let errorMessage = 'No fue posible iniciar sesion.';
            if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(e.code)) {
                errorMessage = 'Credenciales invalidas o usuario no creado.';
            } else if (e.code === 'auth/invalid-email') {
                errorMessage = 'Correo invalido.';
            } else if (e.code === 'auth/user-disabled') {
                errorMessage = 'Este usuario esta deshabilitado en Firebase.';
            } else if (e.code === 'auth/operation-not-allowed') {
                errorMessage = 'El acceso con correo y contrasena no esta habilitado en Firebase.';
            } else if (e.code === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
            } else if (e.code === 'auth/network-request-failed') {
                errorMessage = 'No hay conexion con Firebase. Revisa internet e intenta de nuevo.';
            }
            setError(errorMessage);
            console.error('Error de Login:', e);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="erp-login-page">
            <header className="erp-login-topbar">
                <img src={loginLogo} alt="" />
                <strong>CSM Contabilidad</strong>
                <span>Centro contable</span>
                <b>PRODUCCION</b>
            </header>

            <main className="erp-login-window">
                <section className="erp-login-company-panel">
                    <div className="erp-login-company-heading">Empresa</div>
                    <img src={loginLogo} alt={loginCompanyName} />
                    <h1>{loginCompanyName}</h1>
                    <p>Sistema contable y financiero</p>
                    <dl>
                        <div><dt>Ambiente</dt><dd>Produccion</dd></div>
                        <div><dt>Base de datos</dt><dd>Firebase / SICAR</dd></div>
                        <div><dt>Zona horaria</dt><dd>America/Managua</dd></div>
                    </dl>
                </section>

                <section className="erp-login-form-panel">
                    <div className="erp-login-kicker">Acceso al sistema</div>
                    <h2>Iniciar sesion</h2>
                    <p>Ingrese sus credenciales de usuario.</p>

                    {error && <div className="erp-login-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <label htmlFor="email">Correo electronico</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            disabled={isLoggingIn}
                        />

                        <label htmlFor="password">Contrasena</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            disabled={isLoggingIn}
                        />

                        <button type="submit" disabled={isLoggingIn}>
                            {isLoggingIn ? 'Validando...' : 'Entrar'}
                        </button>
                    </form>

                    <div className="erp-login-footnote">Acceso autorizado unicamente</div>
                </section>
            </main>
        </div>
    );
}
