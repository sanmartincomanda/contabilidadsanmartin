// src/components/Header.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect, useRef } from 'react';

// --- ICONOS SVG INLINE ---
const Icons = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    plus: "M12 4v16m8-8H4",
    wallet: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    creditCard: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
    check: "M5 13l4 4L19 7",
    menu: "M4 6h16M4 12h16M4 18h16",
    x: "M6 18L18 6M6 6l12 12",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    chevronDown: "M19 9l-7 7-7-7"
};

const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const dropdownRef = useRef(null);

    // Detectar scroll para efecto glassmorphism
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isLimitedUser = user?.email === "adriandiazc95@gmail.com";

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (e) {
            console.error("Error al cerrar sesión", e);
        }
    };

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path);
    };

    // Navegación directa sin dropdown problemático
    const handleDataEntryClick = (tab) => {
        navigate(`/ingresar?tab=${tab}`);
        setIsMenuOpen(false);
        setIsMobileMenuOpen(false);
    };

    const NavLink = ({ to, children, icon, active = false }) => (
        <Link 
            to={to} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                active 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
        >
            {icon && <Icon path={Icons[icon]} className="w-4 h-4" />}
            {children}
        </Link>
    );

    const DataEntryButton = () => {
        if (isLimitedUser) return null;

        return (
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        isMenuOpen || location.pathname === '/ingresar'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <Icon path={Icons.plus} className="w-4 h-4" />
                    Ingresar Datos
                    <Icon path={Icons.chevronDown} className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-fade-in">
                        <div className="py-2">
                            <button 
                                onClick={() => handleDataEntryClick('Ingresos')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Icon path={Icons.trendingUp} className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="font-bold">Ingresos</div>
                                    <div className="text-xs text-slate-400">Registrar ventas</div>
                                </div>
                            </button>
                            <button 
                                onClick={() => handleDataEntryClick('Gastos')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                    <Icon path={Icons.trendingDown} className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                    <div className="font-bold">Gastos</div>
                                    <div className="text-xs text-slate-400">Registrar egresos</div>
                                </div>
                            </button>
                            <button 
                                onClick={() => handleDataEntryClick('Inventario')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Icon path={Icons.wallet} className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <div className="font-bold">Inventario</div>
                                    <div className="text-xs text-slate-400">Control de stock</div>
                                </div>
                            </button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button 
                                onClick={() => handleDataEntryClick('Presupuesto')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                    <Icon path={Icons.chart} className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <div className="font-bold">Presupuestos</div>
                                    <div className="text-xs text-slate-400">Planificación</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
            `}</style>

            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isScrolled 
                    ? 'bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-slate-900/20' 
                    : 'bg-slate-900'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* LOGO */}
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                                <Icon path={Icons.wallet} className="w-6 h-6 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <span className="text-xl font-black text-white tracking-tight">Finanzas</span>
                                <span className="text-xl font-black text-blue-400">App</span>
                            </div>
                        </Link>

                        {/* NAVEGACIÓN DESKTOP */}
                        {user && (
                            <div className="hidden md:flex items-center gap-1">
                                <NavLink to="/" icon="home" active={isActive('/')}>
                                    Inicio
                                </NavLink>

                                {!isLimitedUser && <DataEntryButton />}

                                <NavLink 
                                    to="/cuentas-pagar" 
                                    icon="creditCard" 
                                    active={isActive('/cuentas-pagar')}
                                >
                                    Cuentas por Pagar
                                </NavLink>

                                {!isLimitedUser && (
                                    <>
                                        <NavLink 
                                            to="/conciliacion" 
                                            icon="check" 
                                            active={isActive('/conciliacion')}
                                        >
                                            Conciliación
                                        </NavLink>
                                        <NavLink 
                                            to="/reportes" 
                                            icon="chart" 
                                            active={isActive('/reportes')}
                                        >
                                            Reportes
                                        </NavLink>
                                        <NavLink 
                                            to="/maestros/categorias" 
                                            icon="tag" 
                                            active={isActive('/maestros')}
                                        >
                                            Categorías
                                        </NavLink>
                                    </>
                                )}

                                {/* USUARIO Y LOGOUT */}
                                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
                                    <div className="hidden lg:flex flex-col items-end">
                                        <span className="text-sm font-bold text-white">{user.email.split('@')[0]}</span>
                                        <span className="text-xs text-slate-400">{user.email}</span>
                                    </div>
                                    <button 
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl font-semibold text-sm transition-all duration-200 border border-red-500/20 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/30"
                                    >
                                        <Icon path={Icons.logout} className="w-4 h-4" />
                                        <span className="hidden sm:inline">Salir</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* BOTÓN MÓVIL */}
                        {user && (
                            <div className="md:hidden">
                                <button
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <Icon path={isMobileMenuOpen ? Icons.x : Icons.menu} className="w-6 h-6" />
                                </button>
                            </div>
                        )}

                        {!user && (
                            <Link 
                                to="/login" 
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/30"
                            >
                                <Icon path={Icons.user} className="w-4 h-4" />
                                Iniciar Sesión
                            </Link>
                        )}
                    </div>
                </div>

                {/* MENÚ MÓVIL */}
                {isMobileMenuOpen && user && (
                    <div className="md:hidden bg-slate-800/95 backdrop-blur-xl border-t border-slate-700 animate-fade-in">
                        <div className="px-4 pt-2 pb-4 space-y-1">
                            <Link 
                                to="/" 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm ${isActive('/') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                            >
                                <Icon path={Icons.home} className="w-5 h-5" />
                                Inicio
                            </Link>

                            {!isLimitedUser && (
                                <>
                                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresar Datos</div>
                                    <button 
                                        onClick={() => handleDataEntryClick('Ingresos')}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-slate-300 hover:text-white hover:bg-white/10"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <Icon path={Icons.plus} className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        Ingresos
                                    </button>
                                    <button 
                                        onClick={() => handleDataEntryClick('Gastos')}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-slate-300 hover:text-white hover:bg-white/10"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                            <Icon path={Icons.plus} className="w-4 h-4 text-red-400" />
                                        </div>
                                        Gastos
                                    </button>
                                    <button 
                                        onClick={() => handleDataEntryClick('Inventario')}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-slate-300 hover:text-white hover:bg-white/10"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                            <Icon path={Icons.wallet} className="w-4 h-4 text-blue-400" />
                                        </div>
                                        Inventario
                                    </button>
                                </>
                            )}

                            <div className="border-t border-slate-700 my-2"></div>

                            <Link 
                                to="/cuentas-pagar" 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm ${isActive('/cuentas-pagar') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                            >
                                <Icon path={Icons.creditCard} className="w-5 h-5" />
                                Cuentas por Pagar
                            </Link>

                            {!isLimitedUser && (
                                <>
                                    <Link 
                                        to="/conciliacion" 
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm ${isActive('/conciliacion') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <Icon path={Icons.check} className="w-5 h-5" />
                                        Conciliación
                                    </Link>
                                    <Link 
                                        to="/reportes" 
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm ${isActive('/reportes') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <Icon path={Icons.chart} className="w-5 h-5" />
                                        Reportes
                                    </Link>
                                    <Link 
                                        to="/maestros/categorias" 
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm ${isActive('/maestros') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <Icon path={Icons.tag} className="w-5 h-5" />
                                        Categorías
                                    </Link>
                                </>
                            )}

                            <div className="border-t border-slate-700 my-2"></div>

                            <div className="px-4 py-2">
                                <div className="text-sm font-bold text-white mb-1">{user.email}</div>
                                <button 
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-semibold text-sm border border-red-500/20"
                                >
                                    <Icon path={Icons.logout} className="w-4 h-4" />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
            
            {/* SPACER para compensar el header fixed */}
            <div className="h-16"></div>
        </>
    );
}