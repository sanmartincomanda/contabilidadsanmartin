import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { db } from './firebase';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';

import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Header from './components/Header';
import GastosDiarios from './components/GastosDiarios';
import { DataEntry } from './components/DataEntry';
import { BankReconciliation } from './components/BankReconciliation';
import Reports from './components/Reports';
import CategoryManager from './components/CategoryManager';
import { AccountsPayable } from './components/AccountsPayable';
import { fmt } from './constants';

const BRAND_LOGO = '/amparito-logo.jpeg';

const DATA_ENTRY_COLLECTIONS = [
    'ingresos',
    'gastos',
    'categorias',
    'inventarios',
    'compras',
    'presupuestos',
    'cuentasPorCobrar',
    'patrimonio',
];

const ACCOUNTS_PAYABLE_COLLECTIONS = [
    'cuentas_por_pagar',
    'abonos_pagar',
    'proveedores',
];

const CATEGORY_COLLECTIONS = ['categorias'];

const REPORT_COLLECTIONS = [
    'ingresos',
    'gastos',
    'inventarios',
    'compras',
    'presupuestos',
    'cuentas_por_pagar',
];

const DASHBOARD_COLLECTIONS = [
    'ingresos',
    'gastos',
    'compras',
    'cuentas_por_pagar',
];

// --- DASHBOARD ---

const Dashboard = ({ data = {} }) => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const today = new Date().toISOString().substring(0, 10);
    const mes = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const ingresos = data.ingresos || [];
    const gastos = data.gastos || [];
    const compras = data.compras || [];
    const facturas = data.cuentas_por_pagar || [];

    const mesIngresos = ingresos.filter(i => (i.month || (i.date || '').substring(0, 7)) === currentMonth);
    const mesGastos = gastos.filter(g => (g.date || '').substring(0, 7) === currentMonth);
    const mesCompras = compras.filter(c => (c.month || (c.date || '').substring(0, 7)) === currentMonth);

    const totalIngresos = mesIngresos.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalGastos = mesGastos.reduce((s, g) => s + (Number(g.amount) || 0), 0);
    const totalCompras = mesCompras.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const utilidad = totalIngresos - totalGastos - totalCompras;

    const facturasPendientes = facturas.filter(f => (Number(f.saldo) || 0) > 0.01);
    const totalPendiente = facturasPendientes.reduce((s, f) => s + (Number(f.saldo) || 0), 0);
    const vencidas = facturasPendientes.filter(f => f.vencimiento && f.vencimiento < today);

    const KPICard = ({ title, value, subtitle, bg, textColor, borderColor }) => (
        <div className={`rounded-xl border ${borderColor} ${bg} p-5`}>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#b98b2d] mb-2">{title}</div>
            <div className={`text-2xl font-black ${textColor}`}>{value}</div>
            {subtitle && <div className="text-xs font-medium text-[#8b6a5f] mt-1">{subtitle}</div>}
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Brand header */}
            <div className="overflow-hidden rounded-xl border border-[#e6c9b8] bg-white shadow-sm">
                <div className="h-1 bg-gradient-to-r from-[#a81d24] via-[#f2b635] to-[#a81d24]" />
                <div className="flex items-center justify-between p-6">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#f2b635]/40 bg-[#fdf1d6] px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-[#8a141b] mb-3">
                            Carnes Amparito
                        </div>
                        <h1 className="text-2xl font-black text-[#7f1218]">Centro Contable y de Gestión</h1>
                        <p className="mt-1 text-sm font-medium capitalize text-[#5f4540]">{mes}</p>
                    </div>
                    <img
                        src={BRAND_LOGO}
                        alt="Carnes Amparito"
                        className="hidden h-16 w-16 rounded-xl border border-[#edd5c5] object-cover sm:block"
                    />
                </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KPICard
                    title="Ingresos del Mes"
                    value={fmt(totalIngresos)}
                    subtitle={`${mesIngresos.length} registros`}
                    bg="bg-[#f0fdf4]"
                    textColor="text-[#166534]"
                    borderColor="border-[#bbf7d0]"
                />
                <KPICard
                    title="Gastos del Mes"
                    value={fmt(totalGastos)}
                    subtitle={`${mesGastos.length} registros`}
                    bg="bg-[#fff0f0]"
                    textColor="text-[#7f1218]"
                    borderColor="border-[#fecaca]"
                />
                <KPICard
                    title="Compras del Mes"
                    value={fmt(totalCompras)}
                    subtitle={`${mesCompras.length} registros`}
                    bg="bg-[#faf5ff]"
                    textColor="text-[#581c87]"
                    borderColor="border-[#e9d5ff]"
                />
                <KPICard
                    title="Cuentas por Pagar"
                    value={fmt(totalPendiente)}
                    subtitle={vencidas.length > 0 ? `${vencidas.length} factura(s) vencida(s)` : `${facturasPendientes.length} pendientes`}
                    bg={vencidas.length > 0 ? 'bg-[#fffbeb]' : 'bg-[#fefce8]'}
                    textColor="text-[#92400e]"
                    borderColor={vencidas.length > 0 ? 'border-[#fde68a]' : 'border-[#fef08a]'}
                />
            </div>

            {/* Utilidad del mes */}
            <div className={`rounded-xl border p-5 ${utilidad >= 0 ? 'border-[#bbf7d0] bg-[#f0fdf4]' : 'border-[#fecaca] bg-[#fff5f5]'}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-[#b98b2d]">
                            Resultado del Mes
                        </div>
                        <div className="text-xs text-[#7a5a52] mb-2">Ingresos − Gastos − Compras</div>
                        <div className={`text-3xl font-black ${utilidad >= 0 ? 'text-[#166534]' : 'text-[#7f1218]'}`}>
                            {fmt(utilidad)}
                        </div>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-sm font-black ${utilidad >= 0 ? 'bg-[#bbf7d0] text-[#166534]' : 'bg-[#fecaca] text-[#7f1218]'}`}>
                        {utilidad >= 0 ? 'Positivo' : 'Negativo'}
                    </div>
                </div>
            </div>

            {/* Alertas de vencimientos */}
            {vencidas.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <div className="mb-3 text-sm font-bold text-amber-800">
                        Facturas vencidas — requieren atención ({vencidas.length})
                    </div>
                    <div className="space-y-2">
                        {vencidas.slice(0, 6).map(f => (
                            <div key={f.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                                <div>
                                    <div className="text-sm font-bold text-slate-800">{f.proveedor || f.supplier || 'Sin proveedor'}</div>
                                    <div className="text-xs text-slate-500">
                                        {f.numero || f.invoiceNumber || ''}{f.vencimiento ? ` — Venció: ${f.vencimiento}` : ''}
                                    </div>
                                </div>
                                <div className="text-sm font-black text-amber-800">{fmt(f.saldo)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AppLoadingState = () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#fff8f3] px-6 text-center text-[#7f1218]">
        <img
            src={BRAND_LOGO}
            alt="Carnes Amparito"
            className="h-28 w-28 rounded-[1.75rem] border border-[#edd5c5] bg-white p-2 shadow-xl shadow-[#7f1218]/10"
        />
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.45em] text-[#b98b2d]">Carnes Amparito</p>
            <p className="mt-3 text-2xl font-black">Cargando informacion contable...</p>
        </div>
    </div>
);

const AppErrorState = () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fff4f1] p-6 text-center">
        <img
            src={BRAND_LOGO}
            alt="Carnes Amparito"
            className="mb-6 h-32 w-32 rounded-[2rem] border border-[#f0d3c8] bg-white p-2 shadow-xl shadow-[#7f1218]/10"
        />
        <h1 className="text-3xl font-black text-[#8a141b]">Error de conexion</h1>
        <p className="mt-3 max-w-md text-sm font-medium text-[#6f4d48]">
            No logramos cargar la informacion de Carnes Amparito. Revisa la conexion e intenta nuevamente.
        </p>
        <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-[#a81d24] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#a81d24]/25 transition hover:bg-[#8c171d]"
        >
            Reintentar
        </button>
    </div>
);

const hasCollectionData = (currentData, collections = []) => (
    collections.every((collectionName) => Array.isArray(currentData?.[collectionName]))
);

const useFirestoreCollections = (collections = [], enabled = true, live = true) => {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const dataRef = useRef(data);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        if (!enabled || !db || collections.length === 0) {
            setLoading(false);
            setError(null);
            return;
        }

        const hasCachedData = hasCollectionData(dataRef.current, collections);
        setLoading(!hasCachedData);
        setError(null);

        const unsubscribes = [];
        let mounted = true;
        const loadedCollections = new Set();

        const markCollectionAsLoaded = (collectionName) => {
            if (loadedCollections.has(collectionName)) return;
            loadedCollections.add(collectionName);

            if (mounted && loadedCollections.size === collections.length) {
                setLoading(false);
            }
        };

        const loadCollectionData = async (collectionName) => {
            try {
                const q = query(collection(db, collectionName));
                const snapshot = await getDocs(q);
                if (!mounted) return;

                const list = snapshot.docs.map((item) => ({
                    id: item.id,
                    ...item.data(),
                }));

                setData((prev) => ({ ...prev, [collectionName]: list }));
            } catch (collectionError) {
                if (!mounted) return;
                console.error(`Error en ${collectionName}:`, collectionError);
                setError(collectionError);
            } finally {
                markCollectionAsLoaded(collectionName);
            }
        };

        if (!live && hasCachedData) {
            setLoading(false);
            return;
        }

        collections.forEach((collectionName) => {
            if (!live) {
                loadCollectionData(collectionName);
                return;
            }

            const q = query(collection(db, collectionName));
            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    if (!mounted) return;

                    const list = snapshot.docs.map((item) => ({
                        id: item.id,
                        ...item.data(),
                    }));

                    setData((prev) => ({ ...prev, [collectionName]: list }));
                    markCollectionAsLoaded(collectionName);
                },
                (collectionError) => {
                    console.error(`Error en ${collectionName}:`, collectionError);
                    if (mounted) {
                        setError(collectionError);
                    }
                    markCollectionAsLoaded(collectionName);
                }
            );

            unsubscribes.push(unsubscribe);
        });

        return () => {
            mounted = false;
            unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
    }, [collections, enabled, live]);

    return { data, loading, error, dataIsPopulated: Object.keys(data).length > 0 };
};

function AppContent() {
    const { user } = useAuth();
    const location = useLocation();

    const isLimitedUser = user?.email === 'adriandiazc95@gmail.com';
    const isAdmin = !isLimitedUser;
    const currentPath = location.pathname;
    const needsCategories = currentPath === '/ingresar' || currentPath === '/gastos-diarios' || currentPath.startsWith('/maestros/categorias');
    const dataEntryEnabled = !!user && isAdmin && currentPath === '/ingresar';
    const accountsPayableEnabled = !!user && currentPath === '/cuentas-pagar';
    const reportsEnabled = !!user && isAdmin && currentPath === '/reportes';
    const categoriesEnabled = !!user && needsCategories;
    const dashboardEnabled = !!user && isAdmin && currentPath === '/';

    const { data: categoriesData } = useFirestoreCollections(CATEGORY_COLLECTIONS, categoriesEnabled, true);
    const { data: dataEntryData, loading: dataEntryLoading, error: dataEntryError } = useFirestoreCollections(
        DATA_ENTRY_COLLECTIONS,
        dataEntryEnabled,
        true
    );
    const { data: accountsPayableData, loading: accountsPayableLoading, error: accountsPayableError } = useFirestoreCollections(
        ACCOUNTS_PAYABLE_COLLECTIONS,
        accountsPayableEnabled,
        true
    );
    const { data: reportsData, loading: reportsLoading, error: reportsError } = useFirestoreCollections(
        REPORT_COLLECTIONS,
        reportsEnabled,
        false
    );
    const { data: dashboardData, loading: dashboardLoading } = useFirestoreCollections(
        DASHBOARD_COLLECTIONS,
        dashboardEnabled,
        false
    );
    const categoriesList = categoriesData.categorias || [];

    if (!user) {
        return (
            <main>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </main>
        );
    }

    return (
        <>
            <Header />
            <main className="p-4 md:p-6">
                <Routes>
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute
                                element={
                                    isAdmin ? (
                                        dashboardLoading ? (
                                            <AppLoadingState />
                                        ) : (
                                            <Dashboard data={dashboardData} />
                                        )
                                    ) : (
                                        <Navigate to="/cuentas-pagar" />
                                    )
                                }
                            />
                        }
                    />
                    <Route
                        path="/ingresar"
                        element={
                            <PrivateRoute
                                element={
                                    isAdmin ? (
                                        dataEntryLoading ? (
                                            <AppLoadingState />
                                        ) : dataEntryError ? (
                                            <AppErrorState />
                                        ) : (
                                            <DataEntry data={dataEntryData} categories={categoriesList} />
                                        )
                                    ) : (
                                        <Navigate to="/cuentas-pagar" />
                                    )
                                }
                            />
                        }
                    />
                    <Route
                        path="/gastos-diarios"
                        element={<PrivateRoute element={<GastosDiarios categories={categoriesList} />} />}
                    />
                    <Route
                        path="/conciliacion"
                        element={
                            <PrivateRoute
                                element={isAdmin ? <BankReconciliation /> : <Navigate to="/cuentas-pagar" />}
                            />
                        }
                    />
                    <Route
                        path="/cuentas-pagar"
                        element={
                            <PrivateRoute
                                element={
                                    accountsPayableLoading ? (
                                        <AppLoadingState />
                                    ) : accountsPayableError ? (
                                        <AppErrorState />
                                    ) : (
                                        <AccountsPayable data={accountsPayableData} />
                                    )
                                }
                            />
                        }
                    />
                    <Route
                        path="/reportes"
                        element={
                            <PrivateRoute
                                element={
                                    isAdmin ? (
                                        reportsLoading ? (
                                            <AppLoadingState />
                                        ) : reportsError ? (
                                            <AppErrorState />
                                        ) : (
                                            <Reports data={reportsData} />
                                        )
                                    ) : (
                                        <Navigate to="/cuentas-pagar" />
                                    )
                                }
                            />
                        }
                    />
                    <Route
                        path="/maestros/categorias"
                        element={
                            <PrivateRoute
                                element={isAdmin ? <CategoryManager categories={categoriesList} /> : <Navigate to="/cuentas-pagar" />}
                            />
                        }
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}

export default App;
