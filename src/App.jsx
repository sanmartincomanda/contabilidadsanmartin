// src/App.jsx (VERSIÓN ROBUSTA ACTUALIZADA)

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { db } from './firebase'; 
import { collection, query, onSnapshot } from 'firebase/firestore'; 

// Importación de constantes
import { BRANCHES, CATEGORIES } from './constants'; 

// DEPENDENCIAS DE AUTENTICACIÓN
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Header from './components/Header'; 

// COMPONENTES DE LA APLICACIÓN
import { DataEntry } from './components/DataEntry';
import { BankReconciliation } from './components/BankReconciliation'; 
import Reports from './components/Reports';
import CategoryManager from './components/CategoryManager';
import { AccountsPayable } from './components/AccountsPayable'; // <-- NUEVO IMPORT

// --- Componentes Placeholders ---
const Dashboard = () => (
    <div className="p-8 bg-white rounded-xl shadow-lg">
      <h1 className="text-4xl font-extrabold text-blue-800">Panel de Control Principal</h1>
      <p className="mt-4 text-gray-600">Utiliza la barra de navegación superior para acceder a tus módulos.</p>
    </div>
);

// --- Hook para cargar datos y proveerlos a la App ---
const useAppData = (
    // SE AÑADIERON 'cuentas_por_pagar' y 'abonos_pagar'
    collections = ['ingresos', 'gastos', 'categorias', 'branches', 'inventarios', 'compras', 'presupuestos', 'cuentas_por_pagar', 'abonos_pagar']
) => {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadedCount, setLoadedCount] = useState(0); 
    
    useEffect(() => {
        if (!db) {
            console.error("Firebase DB no inicializada. Verifica tu archivo firebase.js");
            setLoading(false);
            return;
        }
        
        const unsubscribes = [];
        let mounted = true; 

        collections.forEach(col => {
            const q = query(collection(db, col)); 
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!mounted) return; 
                
                const list = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setData(prev => ({ ...prev, [col]: list }));
                
                setLoadedCount(prev => {
                    const newCount = prev + (prev < collections.length ? 1 : 0);
                    if (newCount === collections.length && mounted) {
                        setLoading(false);
                    }
                    return newCount;
                });
            }, (error) => {
                console.error(`🚨 Error al cargar la colección ${col}.`, error);
                if (mounted) {
                    setLoading(false); 
                }
            });
            unsubscribes.push(unsubscribe);
        });
        
        return () => { 
            mounted = false;
            unsubscribes.forEach(unsub => unsub());
        };
    }, [collections.length]); 
    
    const dataIsPopulated = Object.keys(data).length > 0 && loadedCount > 0;

    return { data, loading, dataIsPopulated };
};

function App() {
    const { data: appData, loading: dataLoading, dataIsPopulated } = useAppData();

    const categoriesList = appData.categorias || [];
    
    const branchesList = (appData.branches && appData.branches.length > 0) 
        ? appData.branches 
        : BRANCHES;

    // Pantalla de Carga
    if (dataLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-xl font-medium text-blue-600">Cargando datos de la SuperApp...</div>
            </div>
        );
    }
  
    // Pantalla de Error Crítico
    if (!dataLoading && !dataIsPopulated) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 p-4">
                <h1 className="text-4xl font-extrabold text-red-800">🚨 ERROR CRÍTICO DE CONEXIÓN</h1>
                <p className="mt-4 text-xl text-red-600 text-center">
                    La aplicación no pudo cargar las colecciones de Firebase.
                </p>
                <p className="mt-2 text-lg text-red-600 text-center font-bold">
                    Verifica las reglas de seguridad en la consola de Firebase.
                </p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                    Reintentar Carga
                </button>
            </div>
        );
    }

    return (
        <Router>
            <AuthProvider> 
                <Header /> 
                <main className="p-4">
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route 
                            path="/" 
                            element={<PrivateRoute element={<Dashboard />} />} 
                        />
                        
                        <Route 
                            path="/ingresar" 
                            element={<PrivateRoute 
                                element={<DataEntry 
                                    data={appData} 
                                    categories={categoriesList} 
                                    branches={branchesList} 
                                />} 
                            />} 
                        />
                        
                        <Route 
                            path="/conciliacion" 
                            element={<PrivateRoute element={<BankReconciliation />} />} 
                        />

                        {/* NUEVA RUTA DE CUENTAS POR PAGAR */}
                        <Route 
                            path="/cuentas-pagar" 
                            element={<PrivateRoute 
                                element={<AccountsPayable data={appData} />} 
                            />} 
                        />

                        <Route 
                            path="/reportes" 
                            element={<PrivateRoute 
                                element={<Reports 
                                    data={appData} 
                                    categories={categoriesList} 
                                />} 
                            />} 
                        />

                        <Route 
                            path="/maestros/categorias" 
                            element={<PrivateRoute 
                                element={<CategoryManager categories={categoriesList} />} 
                            />} 
                        />
                        <Route path="*" element={<h1>404: Página no encontrada</h1>} />
                    </Routes>
                </main>
            </AuthProvider>
        </Router>
    );
}

export default App;