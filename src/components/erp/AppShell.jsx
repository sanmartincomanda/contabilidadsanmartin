import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { ContextStrip, ERPIcon, StatusBadge } from './ERPComponents';

const SIDEBAR_STORAGE_KEY = 'csm-erp-sidebar-collapsed';
const FALLBACK_LOGO = '/amparito-logo.jpeg';

const ICONS = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    panelLeft: 'M4 5h16v14H4V5zm5 0v14',
    home: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6',
    plus: 'M12 5v14M5 12h14',
    income: 'M4 7h16v10H4V7zm3 4h10M8 15h4',
    expense: 'M7 4h10v16H7V4zm3 4h4m-4 4h4m-4 4h2',
    inventory: 'm4 7 8-4 8 4-8 4-8-4zm0 0v10l8 4 8-4V7m-8 4v10',
    cart: 'M3 4h2l2.4 10h9.7l2-7H6.1M9 19h.01M17 19h.01',
    depreciation: 'M5 4h14v16H5V4zm4 4h6m-6 4h6m-6 4h3',
    budget: 'M4 6h16v13H4V6zm4-2v4m8-4v4M7 11h3m4 0h3M7 15h3',
    receivable: 'M4 7h16v12H4V7zm3 4h10m-5-7v10m-3-3 3 3 3-3',
    equity: 'M4 19h16M6 16V9m4 7V5m4 11v-4m4 4V7',
    cash: 'M3 7h18v10H3V7zm4 5h.01M17 12h.01M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    reconciliation: 'M5 7h12m0 0-3-3m3 3-3 3M19 17H7m0 0 3 3m-3-3 3-3',
    payable: 'M4 6h16v13H4V6zm3 4h10m-10 4h6',
    card: 'M3 6h18v12H3V6zm0 4h18M7 15h4',
    reports: 'M5 20V10m7 10V4m7 16v-7M3 20h18',
    settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0-5v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.5 1.5m-9 9L6 18m12 0-1.5-1.5m-9-9L6 6',
    search: 'm20 20-4.2-4.2m1.2-4.8a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
    chevron: 'm9 18 6-6-6-6',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM5 21a7 7 0 0 1 14 0',
    logout: 'M14 8V5H5v14h9v-3m-3-4h10m0 0-3-3m3 3-3 3',
    close: 'M6 6l12 12M18 6 6 18',
    building: 'M5 21V4h10v17m0-12h4v12M8 8h4m-4 4h4m-4 4h4',
    database: 'M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3zm0 0v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6m-16 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
};

const routeMeta = (pathname, dataTab) => {
    if (pathname === '/') return { title: 'Centro de trabajo', group: 'Inicio' };
    if (pathname === '/ingresar') return { title: dataTab, group: 'Registro contable' };
    if (pathname === '/gastos-diarios') return { title: 'Caja diaria', group: 'Tesoreria' };
    if (pathname === '/conciliacion') return { title: 'Conciliacion bancaria', group: 'Tesoreria' };
    if (pathname === '/cuentas-pagar') return { title: 'Cuentas por pagar', group: 'Obligaciones' };
    if (pathname === '/pasivos') return { title: 'Pasivos', group: 'Obligaciones' };
    if (pathname === '/reportes') return { title: 'Reportes financieros', group: 'Analisis' };
    if (pathname === '/configuraciones') return { title: 'Configuraciones', group: 'Administracion' };
    if (pathname.startsWith('/maestros')) return { title: 'Categorias', group: 'Maestros' };
    return { title: 'Contabilidad', group: 'CSM ERP' };
};

const SidebarItem = ({ item, collapsed, active, onSelect }) => (
    <button
        type="button"
        className={`erp-sidebar-item ${active ? 'is-active' : ''}`}
        onClick={() => onSelect(item)}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
    >
        <ERPIcon path={ICONS[item.icon] || ICONS.plus} className="h-[17px] w-[17px] shrink-0" />
        {!collapsed && <span>{item.label}</span>}
    </button>
);

const Sidebar = ({ groups, collapsed, mobileOpen, onSelect, onClose, activeCompany, location }) => (
    <>
        <button
            type="button"
            className={`erp-sidebar-backdrop ${mobileOpen ? 'is-open' : ''}`}
            onClick={onClose}
            aria-label="Cerrar menu"
        />
        <aside className={`erp-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
            <div className="erp-sidebar-brand">
                <img src={activeCompany.logo || FALLBACK_LOGO} alt={activeCompany.name} />
                {!collapsed && (
                    <div>
                        <strong>CSM Contabilidad</strong>
                        <span>{activeCompany.name}</span>
                    </div>
                )}
                <button type="button" className="erp-sidebar-mobile-close" onClick={onClose} aria-label="Cerrar menu">
                    <ERPIcon path={ICONS.close} />
                </button>
            </div>

            <nav className="erp-sidebar-nav" aria-label="Navegacion principal">
                {groups.map((group) => (
                    <div className="erp-sidebar-group" key={group.label}>
                        {!collapsed && <div className="erp-sidebar-group-label">{group.label}</div>}
                        {collapsed && <div className="erp-sidebar-group-rule" />}
                        <div className="erp-sidebar-group-items">
                            {group.items.map((item) => {
                                const active = item.tab
                                    ? location.pathname === '/ingresar' && item.isCurrentTab
                                    : item.path === '/'
                                        ? location.pathname === '/'
                                        : location.pathname.startsWith(item.path);
                                return (
                                    <SidebarItem
                                        key={item.id}
                                        item={item}
                                        collapsed={collapsed}
                                        active={active}
                                        onSelect={onSelect}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="erp-sidebar-footer">
                <div className="erp-sidebar-company" title={activeCompany.name}>
                    <ERPIcon path={ICONS.building} className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{activeCompany.name}</span>}
                </div>
            </div>
        </aside>
    </>
);

export default function AppShell({ children }) {
    const { user, logout } = useAuth();
    const { activeCompany, allowedCompanies, canSwitchCompany, setActiveCompanyId } = useCompany();
    const location = useLocation();
    const navigate = useNavigate();
    const searchInputRef = useRef(null);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [query, setQuery] = useState('');

    const isAdmin = user?.email !== 'adriandiazc95@gmail.com';
    const hasDailyExpensesAccess = user?.email === 'adriandiazc95@gmail.com' || isAdmin;
    const dataTab = useMemo(() => new URLSearchParams(location.search).get('tab') || 'Ingresos', [location.search]);
    const page = useMemo(() => routeMeta(location.pathname, dataTab), [dataTab, location.pathname]);
    const environment = String(import.meta.env.VITE_APP_ENV || 'PRODUCCION').toUpperCase();

    const captureItems = useMemo(() => [
        ['Ingresos', 'Ingresos', 'income'],
        ['Gastos', 'Gastos', 'expense'],
        ['Inventario', 'Inventario', 'inventory'],
        ['Compras', 'Compras', 'cart'],
        ['Depreciaciones', 'Depreciaciones', 'depreciation'],
        ['Presupuesto', 'Presupuesto', 'budget'],
        ['Cuentas por Cobrar', 'Cuentas por cobrar', 'receivable'],
        ['Patrimonio', 'Patrimonio', 'equity'],
    ].map(([tab, label, icon]) => ({
        id: `capture-${tab}`,
        label,
        icon,
        tab,
        path: '/ingresar',
        isCurrentTab: dataTab === tab,
    })), [dataTab]);

    const groups = useMemo(() => [
        {
            label: 'General',
            items: [{ id: 'home', label: 'Centro de trabajo', icon: 'home', path: '/' }],
        },
        isAdmin ? { label: 'Registro contable', items: captureItems } : null,
        {
            label: 'Tesoreria',
            items: [
                hasDailyExpensesAccess ? { id: 'cash', label: 'Caja diaria', icon: 'cash', path: '/gastos-diarios' } : null,
                isAdmin ? { id: 'reconciliation', label: 'Conciliacion bancaria', icon: 'reconciliation', path: '/conciliacion' } : null,
            ].filter(Boolean),
        },
        {
            label: 'Obligaciones',
            items: [
                { id: 'payables', label: 'Cuentas por pagar', icon: 'payable', path: '/cuentas-pagar' },
                isAdmin ? { id: 'liabilities', label: 'Pasivos', icon: 'card', path: '/pasivos' } : null,
            ].filter(Boolean),
        },
        isAdmin ? {
            label: 'Analisis',
            items: [{ id: 'reports', label: 'Reportes financieros', icon: 'reports', path: '/reportes' }],
        } : null,
        isAdmin ? {
            label: 'Administracion',
            items: [{ id: 'settings', label: 'Configuraciones', icon: 'settings', path: '/configuraciones' }],
        } : null,
    ].filter(Boolean), [captureItems, hasDailyExpensesAccess, isAdmin]);

    const commands = useMemo(() => groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))), [groups]);
    const filteredCommands = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return commands;
        return commands.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(normalized));
    }, [commands, query]);

    useEffect(() => {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    }, [collapsed]);

    useEffect(() => {
        document.title = `${page.title} | ${activeCompany.name}`;
    }, [activeCompany.name, page.title]);

    useEffect(() => {
        setMobileOpen(false);
        setProfileOpen(false);
    }, [location.pathname, location.search]);

    useEffect(() => {
        const handleKeyboard = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandOpen(true);
            }
            if (event.key === 'Escape') {
                setCommandOpen(false);
                setProfileOpen(false);
                setMobileOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, []);

    useEffect(() => {
        if (!commandOpen) return;
        const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [commandOpen]);

    const handleSelect = (item) => {
        if (item.tab) navigate(`/ingresar?tab=${encodeURIComponent(item.tab)}`);
        else navigate(item.path);
        setCommandOpen(false);
        setMobileOpen(false);
        setQuery('');
    };

    const handleCompanyChange = (event) => {
        setActiveCompanyId(event.target.value);
        navigate('/');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const monthLabel = new Intl.DateTimeFormat('es-NI', { month: 'long', year: 'numeric' }).format(new Date());
    const contextItems = [
        { label: 'Empresa', value: activeCompany.name },
        { label: 'Sucursal', value: activeCompany.branchName || activeCompany.name },
        { label: 'Periodo', value: monthLabel },
        { label: 'Modulo', value: page.title },
        { label: 'Fuente', value: 'Firebase / SICAR' },
    ];

    return (
        <div className={`erp-app-shell ${collapsed ? 'is-sidebar-collapsed' : ''}`}>
            <header className="erp-topbar">
                <div className="erp-topbar-left">
                    <button
                        type="button"
                        className="erp-topbar-icon-button erp-desktop-menu-button"
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={collapsed ? 'Expandir menu' : 'Contraer menu'}
                    >
                        <ERPIcon path={ICONS.panelLeft} className="h-[18px] w-[18px]" />
                    </button>
                    <button
                        type="button"
                        className="erp-topbar-icon-button erp-mobile-menu-button"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Abrir menu"
                    >
                        <ERPIcon path={ICONS.menu} className="h-[18px] w-[18px]" />
                    </button>
                    <img className="erp-topbar-logo" src={activeCompany.logo || FALLBACK_LOGO} alt="" />
                    <div className="erp-topbar-app-name">
                        <strong>CSM Contabilidad</strong>
                        <span>{page.group}</span>
                    </div>
                    <div className="erp-topbar-divider" />
                    <div className="erp-topbar-module" title={page.title}>{page.title}</div>
                </div>

                <button type="button" className="erp-global-search" onClick={() => setCommandOpen(true)}>
                    <ERPIcon path={ICONS.search} className="h-4 w-4" />
                    <span>Buscar modulo o accion</span>
                    <kbd>Ctrl K</kbd>
                </button>

                <div className="erp-topbar-right">
                    {canSwitchCompany ? (
                        <label className="erp-company-selector">
                            <ERPIcon path={ICONS.building} className="h-4 w-4" />
                            <select value={activeCompany.id} onChange={handleCompanyChange} aria-label="Empresa activa">
                                {allowedCompanies.map((company) => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <div className="erp-company-static" title={activeCompany.name}>
                            <ERPIcon path={ICONS.building} className="h-4 w-4" />
                            <span>{activeCompany.name}</span>
                        </div>
                    )}
                    <StatusBadge tone={environment === 'PRODUCCION' ? 'success' : 'warning'}>{environment}</StatusBadge>
                    <div className="erp-profile-menu">
                        <button
                            type="button"
                            className="erp-profile-trigger"
                            onClick={() => setProfileOpen((value) => !value)}
                            aria-expanded={profileOpen}
                        >
                            <span className="erp-user-avatar"><ERPIcon path={ICONS.user} /></span>
                            <span className="erp-profile-name">{user.email.split('@')[0]}</span>
                            <ERPIcon path={ICONS.chevron} className="h-3 w-3" />
                        </button>
                        {profileOpen && (
                            <div className="erp-profile-popover">
                                <div className="erp-profile-identity">
                                    <strong>{user.email.split('@')[0]}</strong>
                                    <span>{user.email}</span>
                                </div>
                                <button type="button" onClick={handleLogout}>
                                    <ERPIcon path={ICONS.logout} className="h-4 w-4" />
                                    Cerrar sesion
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <Sidebar
                groups={groups}
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onSelect={handleSelect}
                onClose={() => setMobileOpen(false)}
                activeCompany={activeCompany}
                location={location}
            />

            <main className="erp-main">
                <ContextStrip items={contextItems} />
                <div className="erp-workspace" key={`${location.pathname}${location.search}`}>
                    {children}
                </div>
            </main>

            {commandOpen && (
                <div className="erp-command-backdrop" role="presentation" onMouseDown={() => setCommandOpen(false)}>
                    <div className="erp-command-palette" role="dialog" aria-modal="true" aria-label="Buscador global" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="erp-command-input-row">
                            <ERPIcon path={ICONS.search} className="h-[18px] w-[18px]" />
                            <input
                                ref={searchInputRef}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && filteredCommands[0]) handleSelect(filteredCommands[0]);
                                }}
                                placeholder="Buscar modulo o accion..."
                            />
                            <kbd>Esc</kbd>
                        </div>
                        <div className="erp-command-results">
                            {filteredCommands.length === 0 ? (
                                <div className="erp-command-empty">No se encontraron opciones.</div>
                            ) : filteredCommands.map((item) => (
                                <button type="button" key={item.id} onClick={() => handleSelect(item)}>
                                    <span className="erp-command-result-icon"><ERPIcon path={ICONS[item.icon] || ICONS.plus} /></span>
                                    <span>
                                        <strong>{item.label}</strong>
                                        <small>{item.group}</small>
                                    </span>
                                    <span className="erp-command-enter">Abrir</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
