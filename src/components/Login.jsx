import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BRAND_LOGO = '/amparito-logo.jpeg';

const Bullet = ({ title, body }) => (
    <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-white/72">{body}</div>
    </div>
);

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoggingIn(true);

        try {
            await login(email, password);
            navigate('/');
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
            <div className="erp-pop-in mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1380px] overflow-hidden rounded-[28px] border border-[#9fc7d9] bg-white shadow-[0_30px_80px_-45px_rgba(6,72,105,.8)] lg:grid-cols-[1.2fr_minmax(360px,460px)]">
                <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#084869] via-[#0c618f] to-[#7fc9dc] p-10 text-white lg:flex lg:flex-col">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,.12),transparent_36%)]" />
                    <div className="relative flex items-start justify-between">
                        <div className="max-w-md">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#d7f4ff]">
                                SAP style finance desk
                            </div>
                            <h1 className="mt-5 text-4xl font-semibold leading-tight">
                                Operacion contable
                                <span className="block text-[#ffe8b5]">clara y diaria.</span>
                            </h1>
                        </div>

                        <div className="rounded-[26px] border border-white/18 bg-white/10 p-2 backdrop-blur-sm">
                            <img
                                src={BRAND_LOGO}
                                alt="Carnes Amparito"
                                className="h-24 w-24 rounded-[22px] border border-white/20 bg-white p-2 object-cover shadow-xl"
                            />
                        </div>
                    </div>

                    <div className="relative mt-auto grid gap-4 xl:grid-cols-3">
                        <Bullet title="Caja diaria" body="Gastos, compras y abonos." />
                        <Bullet title="CxP enlazada" body="Espejo del historial real." />
                        <Bullet title="Reportes" body="Costos, utilidad y pendientes." />
                    </div>
                </section>

                <section className="flex flex-col justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfd_100%)] px-6 py-8 sm:px-10 lg:px-12">
                    <div className="mb-8 flex items-center gap-4 lg:hidden">
                        <img
                            src={BRAND_LOGO}
                            alt="Carnes Amparito"
                            className="h-16 w-16 rounded-[20px] border border-[#d8e9f1] bg-white p-2 object-cover shadow-sm"
                        />
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#0c618f]">
                                Business cockpit
                            </div>
                            <div className="text-2xl font-semibold text-[#173545]">Carnes Amparito</div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#0c618f]">
                            Acceso seguro
                        </div>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#173545]">Iniciar sesion</h2>
                        <p className="mt-2 text-sm text-[#6c8794]">Correo y contrasena</p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-2xl border border-[#e9bdc0] bg-[#fff7f7] px-4 py-3 text-sm font-medium text-[#a81d24]">
                            {error}
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6c8794]">
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
                                className="erp-focus block w-full rounded-2xl border border-[#b8d4e1] bg-white px-4 py-3 text-sm font-medium text-[#173545] disabled:opacity-60"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6c8794]">
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
                                className="erp-focus block w-full rounded-2xl border border-[#b8d4e1] bg-white px-4 py-3 text-sm font-medium text-[#173545] disabled:opacity-60"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="erp-pressable mt-2 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0a628f] via-[#1176a8] to-[#4ca9c5] px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[0_18px_32px_-18px_rgba(12,97,143,.8)] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            {isLoggingIn ? 'Validando...' : 'Entrar'}
                        </button>
                    </form>

                    <div className="mt-6 text-xs text-[#78919d]">Acceso restringido</div>
                </section>
            </div>
        </div>
    );
}
