// src/App.jsx 

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { db } from './firebase'; 
import { collection, query, onSnapshot } from 'firebase/firestore'; 

// Importación de constantes y contextos
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Header from './components/Header'; 
import GastosDiarios from './components/GastosDiarios';

// COMPONENTES DE LA APLICACIÓN
import { DataEntry } from './components/DataEntry';
import { BankReconciliation } from './components/BankReconciliation'; 
import Reports from './components/Reports';
import CategoryManager from './components/CategoryManager';
import { AccountsPayable } from './components/AccountsPayable';
import { runOneBranchMigration } from './services/oneBranchMigration';

const Dashboard = () => (
    <div className="p-8 bg-white rounded-xl shadow-lg">
      <h1 className="text-4xl font-extrabold text-blue-800">Panel de Control Principal</h1>
      <p className="mt-4 text-gray-600">Utiliza la barra de navegación superior para acceder a tus módulos.</p>
    </div>
);

const APP_COLLECTIONS = [
    'ingresos',
    'gastos',
    'categorias',
    'inventarios',
    'compras',
    'presupuestos',
    'cuentas_por_pagar',
    'accountspayable',
    'abonos_pagar',
    'proveedores',
    'cuentasPorCobrar',
    'patrimonio',
    'gastosDiarios'
];

// --- Hook para cargar datos ---
const useAppData = (
    collections = APP_COLLECTIONS,
    enabled = true
) => {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(enabled);
    
    useEffect(() => {
        if (!enabled || !db) {
            setData({});
            setLoading(false);
            return;
        }

        setData({});
        setLoading(true);
        
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

        collections.forEach(col => {
            const q = query(collection(db, col)); 
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!mounted) return; 
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                setData(prev => ({ ...prev, [col]: list }));
                markCollectionAsLoaded(col);
            }, (error) => {
                console.error(`Error en ${col}:`, error);
                markCollectionAsLoaded(col);
            });
            unsubscribes.push(unsubscribe);
        });
        
        return () => { 
            mounted = false;
            unsubscribes.forEach(unsub => unsub());
        };
    }, [collections, enabled]); 
    
    return { data, loading, dataIsPopulated: Object.keys(data).length > 0 };
};

// Componente para manejar las rutas y la lógica de usuario
function AppContent() {
    const { user } = useAuth();
    const { data: appData, loading: dataLoading, dataIsPopulated } = useAppData(undefined, !!user);
    const migrationAttemptedRef = useRef(false);

    // LÓGICA DE PERMISOS ACTUALIZADA
    const isLimitedUser = user?.email === "adriandiazc95@gmail.com";
    const isAdmin = !isLimitedUser;
   const hasDailyExpensesAccess = true;
   

    const categoriesList = appData.categorias || [];
    useEffect(() => {
        if (!user || !isAdmin || dataLoading || !dataIsPopulated || migrationAttemptedRef.current) return;

        migrationAttemptedRef.current = true;

        runOneBranchMigration(appData)
            .then((result) => {
                if (result.operations > 0) {
                    console.info('Migracion unificada completada:', result);
                }
            })
            .catch((error) => {
                migrationAttemptedRef.current = false;
                console.error('Error ejecutando migracion unificada:', error);
            });
    }, [user, isAdmin, dataLoading, dataIsPopulated, appData]);

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

    if (dataLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 text-blue-600 font-medium">
                Cargando datos de la SuperApp...
            </div>
        );
    }

    if (!dataIsPopulated) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 p-4">
                <h1 className="text-2xl font-bold text-red-800">🚨 ERROR DE CONEXIÓN</h1>
                <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <>
            <Header /> 
            <main className="p-4">
                <Routes>
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    
                    <Route path="/" element={<PrivateRoute element={<Dashboard />} />} />
                    
                    <Route 
                        path="/ingresar" 
                        element={<PrivateRoute 
                            element={isAdmin ? <DataEntry data={appData} categories={categoriesList} /> : <Navigate to="/cuentas-pagar" />} 
                        />} 
                    />
                    
                    <Route 
                     path="/gastos-diarios" 
                     element={<PrivateRoute 
                        element={<GastosDiarios categories={categoriesList} />} 
                        />} 
                        />
                    
                    <Route 
                        path="/conciliacion" 
                        element={<PrivateRoute 
                            element={isAdmin ? <BankReconciliation /> : <Navigate to="/cuentas-pagar" />} 
                        />} 
                    />

                    <Route 
                        path="/cuentas-pagar" 
                        element={<PrivateRoute element={<AccountsPayable data={appData} />} />} 
                    />

                    <Route 
                        path="/reportes" 
                        element={<PrivateRoute 
                            element={isAdmin ? <Reports data={appData} /> : <Navigate to="/cuentas-pagar" />} 
                        />} 
                    />

                    <Route 
                        path="/maestros/categorias" 
                        element={<PrivateRoute 
                            element={isAdmin ? <CategoryManager categories={categoriesList} /> : <Navigate to="/cuentas-pagar" />} 
                        />} 
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
