import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BRAND_LOGO = '/amparito-logo.jpeg';

const Metric = ({ label, value }) => (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7fa8bc]">{label}</div>
        <div className="mt-2 text-xl font-extrabold tracking-tight text-white">{value}</div>
    </div>
);

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        try {
            await login(email, password);
        } catch (e) {
            let errorMessage = 'No fue posible iniciar sesion.';
            if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                errorMessage = 'Credenciales invalidas.';
            } else if (e.code === 'auth/invalid-email') {
                errorMessage = 'Correo invalido.';
            }
            setError(errorMessage);
            console.error('Error de Login:', e);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="erp-shell-enter min-h-screen bg-transparent px-4 py-6 lg:px-8 lg:py-8">
            <div className="erp-pop-in mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1440px] overflow-hidden rounded-[30px] border border-[#cfd8e0] bg-[#f3f7fa] shadow-[0_38px_90px_-52px_rgba(7,15,23,.45)] lg:grid-cols-[1.25fr_minmax(360px,460px)]">
                <section className="hidden bg-[linear-gradient(180deg,#0e1722_0%,#131f2c_55%,#1a6f93_100%)] p-10 text-white lg:flex lg:flex-col">
                    <div className="flex items-start justify-between gap-8">
                        <div className="max-w-[420px]">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#79a7bc]">
                                Executive ERP
                            </div>
                            <h1 className="mt-5 text-[42px] font-extrabold leading-[1.02] tracking-tight">
                                Operacion clara.
                                <span className="mt-1 block text-[#a8d8ea]">Sistema serio.</span>
                            </h1>
                            <p className="mt-5 max-w-[360px] text-sm leading-6 text-[#96a9b7]">
                                Caja, compras, cuentas por pagar y reportes en una sola mesa de trabajo.
                            </p>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-sm">
                            <img
                                src={BRAND_LOGO}
                                alt="Carnes Amparito"
                                className="h-24 w-24 rounded-[22px] border border-white/10 bg-white p-2 object-cover shadow-[0_18px_35px_-22px_rgba(0,0,0,.85)]"
                            />
                        </div>
                    </div>

                    <div className="mt-auto grid gap-4 xl:grid-cols-3">
                        <Metric label="Caja" value="Diaria" />
                        <Metric label="Compras" value="Contado / Credito" />
                        <Metric label="Reportes" value="Utilidad y costo" />
                    </div>
                </section>

                <section className="flex flex-col justify-center bg-[linear-gradient(180deg,#fdfefe_0%,#f3f7fa_100%)] px-6 py-8 sm:px-10 lg:px-12">
                    <div className="mb-8 flex items-center gap-4 lg:hidden">
                        <img
                            src={BRAND_LOGO}
                            alt="Carnes Amparito"
                            className="h-16 w-16 rounded-[20px] border border-[#d8e0e7] bg-white p-2 object-cover shadow-sm"
                        />
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#60717e]">
                                Executive ERP
                            </div>
                            <div className="text-2xl font-extrabold tracking-tight text-[#16222d]">Carnes Amparito</div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#60717e]">
                            Acceso seguro
                        </div>
                        <h2 className="mt-3 text-[34px] font-extrabold tracking-tight text-[#16222d]">Iniciar sesion</h2>
                        <p className="mt-2 text-sm text-[#6c7b87]">Correo y contrasena</p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-2xl border border-[#e8c7cb] bg-[#fff8f8] px-4 py-3 text-sm font-medium text-[#a81d24]">
                            {error}
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#657783]">
                                Correo
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                disabled={isLoggingIn}
                                className="erp-focus block h-12 w-full rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-semibold text-[#16222d] shadow-[inset_0_1px_2px_rgba(15,23,42,.04)] disabled:opacity-60"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#657783]">
                                Contrasena
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                disabled={isLoggingIn}
                                className="erp-focus block h-12 w-full rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-semibold text-[#16222d] shadow-[inset_0_1px_2px_rgba(15,23,42,.04)] disabled:opacity-60"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="erp-pressable mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] px-4 text-sm font-extrabold uppercase tracking-[0.22em] text-white shadow-[0_18px_32px_-18px_rgba(14,23,34,.72)] hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            {isLoggingIn ? 'Validando...' : 'Entrar'}
                        </button>
                    </form>

                    <div className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a98a3]">Acceso restringido</div>
                </section>
            </div>
        </div>
    );
}
