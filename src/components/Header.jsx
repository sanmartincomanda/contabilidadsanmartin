import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BRAND_LOGO = '/amparito-logo.jpeg';

const Icons = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    plus: 'M12 4v16m8-8H4',
    cash: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    wallet: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    creditCard: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    gear: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z',
    logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    menu: 'M4 6h16M4 12h16M4 18h16',
    x: 'M6 18L18 6M6 6l12 12',
    mail: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-2 10H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z',
    spark: 'M12 3l1.912 5.813L20 10.5l-5.088 1.687L13 18l-1.912-5.813L6 10.5l5.088-1.687L12 3z',
};

const Icon = ({ path, className = 'h-4 w-4' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.9">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const SidebarLink = ({ icon, label, active, onClick, compact = false }) => (
    <button
        onClick={onClick}
        className={`erp-pressable erp-soft-glow flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left ${
            active
                ? 'border-[#2f5f7a] bg-[#173042] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.05)]'
                : 'border-transparent text-[#9ba9b7] hover:border-[#22374a] hover:bg-[#121f2c] hover:text-[#eaf2f6]'
        } ${compact ? 'text-[13px] font-medium' : 'text-sm font-semibold'}`}
    >
        <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                active ? 'bg-[#1d89b3] text-white' : 'bg-[#0f1a25] text-[#7bb9d3]'
            }`}
        >
            <Icon path={Icons[icon]} className="h-4 w-4" />
        </span>
        <span className="truncate">{label}</span>
    </button>
);

const MobileNavButton = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`erp-pressable flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center ${
            active ? 'bg-[#152533] text-white shadow-[0_14px_26px_-18px_rgba(15,23,42,.7)]' : 'text-[#58707f]'
        }`}
    >
        <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-white/12' : 'bg-[#edf4f8]'}`}>
            <Icon path={Icons[icon]} className="h-4 w-4" />
        </span>
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
    </button>
);

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isAdmin = user?.email !== 'adriandiazc95@gmail.com';
    const hasDailyExpensesAccess = user?.email === 'adriandiazc95@gmail.com' || isAdmin;
    const currentDataTab = useMemo(
        () => new URLSearchParams(location.search).get('tab') || 'Ingresos',
        [location.search]
    );

    const pageTitle = useMemo(() => {
        if (location.pathname === '/ingresar') return `Captura · ${currentDataTab}`;
        if (location.pathname === '/gastos-diarios') return 'Caja diaria';
        if (location.pathname === '/cuentas-pagar') return 'Cuentas por pagar';
        if (location.pathname === '/pasivos') return 'Pasivos';
        if (location.pathname === '/conciliacion') return 'Conciliacion';
        if (location.pathname === '/reportes') return 'Reportes';
        if (location.pathname === '/configuraciones') return 'Configuraciones';
        if (location.pathname.startsWith('/maestros')) return 'Maestros';
        return 'Centro de control';
    }, [currentDataTab, location.pathname]);

    const mainMenu = [
        { id: 'home', label: 'Inicio', icon: 'home', allowed: true, action: () => navigate('/') },
        { id: 'cash', label: 'Caja diaria', icon: 'cash', allowed: hasDailyExpensesAccess, action: () => navigate('/gastos-diarios') },
        { id: 'payables', label: 'Cuentas por pagar', icon: 'wallet', allowed: true, action: () => navigate('/cuentas-pagar') },
        { id: 'liabilities', label: 'Pasivos', icon: 'creditCard', allowed: isAdmin, action: () => navigate('/pasivos') },
        { id: 'reports', label: 'Reportes', icon: 'chart', allowed: isAdmin, action: () => navigate('/reportes') },
        { id: 'settings', label: 'Configuraciones', icon: 'gear', allowed: isAdmin, action: () => navigate('/configuraciones') },
    ].filter((item) => item.allowed);

    const dataEntryItems = [
        { tab: 'Ingresos', label: 'Ingresos' },
        { tab: 'Gastos', label: 'Gastos' },
        { tab: 'Inventario', label: 'Inventario' },
        { tab: 'Compras', label: 'Compras' },
        { tab: 'Depreciaciones', label: 'Depreciacion' },
        { tab: 'Presupuesto', label: 'Presupuesto' },
        { tab: 'Cuentas por Cobrar', label: 'C. cobrar' },
        { tab: 'Patrimonio', label: 'Patrimonio' },
    ];

    const mobilePrimaryMenu = [
        { id: 'home', label: 'Inicio', icon: 'home', active: location.pathname === '/', onClick: () => navigate('/') },
        isAdmin
            ? {
                id: 'capture',
                label: 'Captura',
                icon: 'plus',
                active: location.pathname === '/ingresar',
                onClick: () => navigate(`/ingresar?tab=${encodeURIComponent(currentDataTab || 'Ingresos')}`),
            }
            : null,
        hasDailyExpensesAccess
            ? {
                id: 'cash',
                label: 'Caja',
                icon: 'cash',
                active: location.pathname.startsWith('/gastos-diarios'),
                onClick: () => navigate('/gastos-diarios'),
            }
            : null,
        {
            id: 'payables',
            label: 'Pagar',
            icon: 'wallet',
            active: location.pathname.startsWith('/cuentas-pagar'),
            onClick: () => navigate('/cuentas-pagar'),
        },
        isAdmin
            ? {
                id: 'liabilities',
                label: 'Pasivos',
                icon: 'creditCard',
                active: location.pathname.startsWith('/pasivos'),
                onClick: () => navigate('/pasivos'),
            }
            : null,
        isAdmin
            ? {
                id: 'reports',
                label: 'Reportes',
                icon: 'chart',
                active: location.pathname.startsWith('/reportes'),
                onClick: () => navigate('/reportes'),
            }
            : null,
    ].filter(Boolean);

    const isActivePath = (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`);

    const handleDataEntry = (tab) => {
        navigate(`/ingresar?tab=${encodeURIComponent(tab)}`);
        setMobileOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Error al cerrar sesion', error);
        }
    };

    if (!user) return null;

    return (
        <>
            <aside className="erp-shell-card fixed inset-y-0 left-0 z-40 hidden w-[288px] border-r border-[#1d2b38] text-white lg:flex lg:flex-col">
                <div className="border-b border-[#243443] px-5 py-5">
                    <div className="flex items-center gap-3">
                        <img
                            src={BRAND_LOGO}
                            alt="Carnes Amparito"
                            className="h-14 w-14 rounded-2xl border border-white/12 bg-white p-1.5 object-cover shadow-[0_16px_30px_-20px_rgba(0,0,0,.7)]"
                        />
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#6ea8bf]">
                                Executive ERP
                            </div>
                            <div className="truncate text-lg font-bold tracking-tight text-[#f7fbfd]">Carnes Amparito</div>
                            <div className="mt-1 text-[11px] text-[#7f92a3]">Operacion financiera diaria</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {isAdmin && (
                        <div className="mb-5">
                            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#6f8393]">
                                Captura
                            </div>
                            <div className="space-y-1.5">
                                {dataEntryItems.map((item) => (
                                    <SidebarLink
                                        key={item.tab}
                                        icon="plus"
                                        label={item.label}
                                        compact={true}
                                        active={location.pathname === '/ingresar' && currentDataTab === item.tab}
                                        onClick={() => handleDataEntry(item.tab)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#6f8393]">
                        Modulos
                    </div>
                    <div className="space-y-1.5">
                        {mainMenu.map((item) => (
                            <SidebarLink
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={
                                    (item.id === 'home' && location.pathname === '/') ||
                                    (item.id !== 'home' && (
                                        (item.id === 'cash' && isActivePath('/gastos-diarios')) ||
                                        (item.id === 'payables' && isActivePath('/cuentas-pagar')) ||
                                        (item.id === 'liabilities' && isActivePath('/pasivos')) ||
                                        (item.id === 'reports' && isActivePath('/reportes')) ||
                                        (item.id === 'settings' && (isActivePath('/configuraciones') || isActivePath('/maestros')))
                                    ))
                                }
                                onClick={item.action}
                            />
                        ))}
                    </div>
                </div>

                <div className="border-t border-[#243443] px-4 py-4">
                    <div className="rounded-2xl border border-[#22313f] bg-[#101c28] px-3.5 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173042] text-[#83bdd5]">
                                <Icon path={Icons.user} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[#eef5f8]">{user.email.split('@')[0]}</div>
                                <div className="truncate text-xs text-[#7f92a3]">{user.email}</div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="erp-pressable mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#294154] bg-[#162330] px-3 py-2 text-sm font-semibold text-[#dbe8ee] hover:border-[#365a71] hover:bg-[#1a2b3a]"
                        >
                            <Icon path={Icons.logout} className="h-4 w-4" />
                            Cerrar sesion
                        </button>
                    </div>
                </div>
            </aside>

            <header className="erp-topbar-glow fixed inset-x-0 top-0 z-30 border-b border-[#d1dae2] bg-[rgba(248,251,253,0.92)] text-[#15222d] backdrop-blur lg:left-[288px]">
                <div className="flex h-[78px] items-center justify-between px-4 lg:h-[74px] lg:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            onClick={() => setMobileOpen((prev) => !prev)}
                            className="erp-pressable rounded-2xl border border-[#d1dae2] bg-white p-2.5 text-[#1b3546] hover:border-[#b9c5d1] hover:bg-[#f5f8fb] lg:hidden"
                        >
                            <Icon path={mobileOpen ? Icons.x : Icons.menu} className="h-5 w-5" />
                        </button>

                        <div className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[#d7dfe6] bg-white lg:flex">
                            <Icon path={Icons.spark} className="h-5 w-5 text-[#4d6372]" />
                        </div>

                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d7f8d]">
                                Operacion
                            </div>
                            <div className="truncate text-base font-semibold tracking-tight text-[#16222d] lg:text-lg">{pageTitle}</div>
                        </div>
                    </div>

                    <div className="hidden items-center gap-3 lg:flex">
                        <div className="erp-command-strip flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm text-[#4f6270]">
                            <Icon path={Icons.mail} className="h-4 w-4 text-[#6c8190]" />
                            <span className="text-sm font-medium">Carnes Amparito</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-[#d7dfe6] bg-white px-3.5 py-2 shadow-[0_10px_18px_-16px_rgba(15,23,42,.5)]">
                            <Icon path={Icons.user} className="h-4 w-4 text-[#6c8190]" />
                            <span className="text-sm font-semibold text-[#304553]">{user.email.split('@')[0]}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:hidden">
                        <div className="rounded-2xl border border-[#d7dfe6] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#58707f]">
                            Web movil
                        </div>
                    </div>
                </div>
            </header>

            <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 lg:hidden">
                <div className={`mx-auto grid max-w-md gap-2 rounded-[28px] border border-[#d7dfe6] bg-[rgba(248,251,253,0.96)] p-2 shadow-[0_26px_52px_-28px_rgba(12,20,29,.45)] backdrop-blur ${
                    mobilePrimaryMenu.length >= 6 ? 'grid-cols-6' : mobilePrimaryMenu.length >= 5 ? 'grid-cols-5' : 'grid-cols-4'
                }`}>
                    {mobilePrimaryMenu.map((item) => (
                        <MobileNavButton
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            active={item.active}
                            onClick={item.onClick}
                        />
                    ))}
                </div>
            </nav>

            {mobileOpen && (
                <div className="erp-pop-in fixed inset-0 z-40 bg-[#07111b]/56 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
                    <div
                        className="erp-shell-card absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-[30px] border border-[#1d2b38] shadow-2xl erp-route-enter"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-[#243443] px-5 py-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={BRAND_LOGO}
                                        alt="Carnes Amparito"
                                        className="h-12 w-12 rounded-2xl border border-white/12 bg-white p-1.5 object-cover"
                                    />
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6ea8bf]">
                                            Mobile suite
                                        </div>
                                        <div className="text-base font-bold text-[#f7fbfd]">Carnes Amparito</div>
                                        <div className="mt-1 text-[11px] text-[#7f92a3]">Accesos completos</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="erp-pressable rounded-2xl border border-white/10 bg-white/8 p-2 text-white/80"
                                >
                                    <Icon path={Icons.x} className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[calc(82vh-160px)] overflow-y-auto px-4 py-4">
                            {isAdmin && (
                                <>
                                    <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#6f8393]">
                                        Captura
                                    </div>
                                    <div className="mb-6 grid grid-cols-2 gap-2">
                                        {dataEntryItems.map((item) => (
                                            <SidebarLink
                                                key={item.tab}
                                                icon="plus"
                                                label={item.label}
                                                compact={true}
                                                active={location.pathname === '/ingresar' && currentDataTab === item.tab}
                                                onClick={() => handleDataEntry(item.tab)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#6f8393]">
                                Modulos
                            </div>
                            <div className="space-y-1.5">
                                {mainMenu.map((item) => (
                                    <SidebarLink
                                        key={item.id}
                                        icon={item.icon}
                                        label={item.label}
                                        active={
                                            (item.id === 'home' && location.pathname === '/') ||
                                            (item.id !== 'home' && (
                                                (item.id === 'cash' && isActivePath('/gastos-diarios')) ||
                                                (item.id === 'payables' && isActivePath('/cuentas-pagar')) ||
                                                (item.id === 'liabilities' && isActivePath('/pasivos')) ||
                                                (item.id === 'reports' && isActivePath('/reportes')) ||
                                                (item.id === 'settings' && (isActivePath('/configuraciones') || isActivePath('/maestros')))
                                            ))
                                        }
                                        onClick={() => {
                                            item.action();
                                            setMobileOpen(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-[#243443] px-4 py-4">
                            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#22313f] bg-[#101c28] px-3.5 py-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173042] text-[#83bdd5]">
                                    <Icon path={Icons.user} className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-[#eef5f8]">{user.email.split('@')[0]}</div>
                                    <div className="truncate text-xs text-[#7f92a3]">{user.email}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="erp-pressable flex w-full items-center justify-center gap-2 rounded-xl border border-[#294154] bg-[#162330] px-3 py-3 text-sm font-semibold text-[#dbe8ee] hover:border-[#365a71]"
                            >
                                <Icon path={Icons.logout} className="h-4 w-4" />
                                Cerrar sesion
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
