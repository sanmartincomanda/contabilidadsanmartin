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

const Dashboard = () => (
    <div className="overflow-hidden rounded-[2rem] border border-[#e6c9b8] bg-gradient-to-br from-[#fff8f2] via-white to-[#f7e5d9] shadow-[0_25px_80px_rgba(127,18,24,0.12)]">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.3fr_0.7fr] lg:p-12">
            <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#f2b635]/40 bg-[#fdf1d6] px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-[#8a141b]">
                    Carnes Amparito
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-black leading-tight text-[#7f1218] lg:text-5xl">
                        Centro Contable y de Gestion
                    </h1>
                    <p className="max-w-2xl text-base font-medium leading-7 text-[#5f4540] lg:text-lg">
                        Administra ingresos, costos, cuentas por pagar y reportes con una imagen alineada a la historia y calidad de Carnes Amparito.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#ead6ca] bg-white/80 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#b98b2d]">Marca</div>
                        <div className="mt-2 text-lg font-black text-[#7f1218]">Identidad Amparito</div>
                    </div>
                    <div className="rounded-2xl border border-[#ead6ca] bg-white/80 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#b98b2d]">Operacion</div>
                        <div className="mt-2 text-lg font-black text-[#7f1218]">Caja y compras</div>
                    </div>
                    <div className="rounded-2xl border border-[#ead6ca] bg-white/80 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#b98b2d]">Control</div>
                        <div className="mt-2 text-lg font-black text-[#7f1218]">Reportes claros</div>
                    </div>
                </div>
            </div>
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-8 rounded-full bg-[#a81d24]/10 blur-3xl" />
                <div className="relative rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-2xl shadow-[#7f1218]/15">
                    <img
                        src={BRAND_LOGO}
                        alt="Carnes Amparito"
                        className="mx-auto h-auto w-full max-w-xs rounded-[1.5rem] object-cover"
                    />
                </div>
            </div>
        </div>
    </div>
);

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
                    <Route path="/" element={<PrivateRoute element={<Dashboard />} />} />
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
