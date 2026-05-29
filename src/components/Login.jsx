import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BRAND_LOGO = '/amparito-logo.jpeg';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (e) {
            let errorMessage = 'Error al iniciar sesion. Verifica credenciales o conexion.';
            if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                errorMessage = 'Credenciales invalidas.';
            } else if (e.code === 'auth/invalid-email') {
                errorMessage = 'Formato de correo invalido.';
            }
            setError(errorMessage);
            console.error('Error de Login:', e);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">

                {/* Brand mark */}
                <div className="flex flex-col items-center mb-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-md mb-4">
                        <img
                            src={BRAND_LOGO}
                            alt="Carnes Amparito"
                            className="h-16 w-16 rounded-lg object-cover"
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#f2b635]">Centro Contable</p>
                        <h1 className="text-2xl font-black text-slate-900 mt-1">Carnes Amparito</h1>
                        <p className="text-sm text-slate-400 mt-1">Sistema de gestion financiera</p>
                    </div>
                </div>

                {/* Login card */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="h-0.5 bg-gradient-to-r from-[#a81d24] via-[#f2b635] to-[#a81d24]" />
                    <div className="p-6 sm:p-8">
                        <div className="mb-6">
                            <h2 className="text-lg font-black text-slate-900">Iniciar sesion</h2>
                            <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wider font-medium">Acceso restringido — personal autorizado</p>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-[#a81d24]">
                                {error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                                    Correo electronico
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoggingIn}
                                    className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all focus:border-[#a81d24] focus:ring-2 focus:ring-[#a81d24]/10 disabled:opacity-60"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                                    Contrasena
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoggingIn}
                                    className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all focus:border-[#a81d24] focus:ring-2 focus:ring-[#a81d24]/10 disabled:opacity-60"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="mt-2 w-full rounded-lg bg-[#a81d24] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-[#7f1218] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isLoggingIn ? 'Verificando...' : 'Entrar al sistema'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer note */}
                <p className="mt-6 text-center text-xs text-slate-400">
                    Uso exclusivo del personal de Carnes Amparito
                </p>
            </div>
        </div>
    );
}
