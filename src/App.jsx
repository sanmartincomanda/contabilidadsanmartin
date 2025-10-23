// src/App.jsx (IMPORTS CORREGIDOS)

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { db } from './firebase'; 
import { collection, query, onSnapshot } from 'firebase/firestore'; 

// 👇 ¡IMPORTACIÓN DE CONSTANTES FALTANTE! 
// Necesitas las sucursales y las categorías iniciales.
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
// --- Componentes Placeholders ---
const Dashboard = () => (
    <div className="p-8 bg-white rounded-xl shadow-lg">
      <h1 className="text-4xl font-extrabold text-blue-800">Panel de Control Principal</h1>
      <p className="mt-4 text-gray-600">Utiliza la barra de navegación superior para acceder a tus módulos.</p>
    </div>
);

// --- Hook para cargar datos y proveerlos a la App ---
const useAppData = (
    // Se asegura de escuchar las 6 colecciones.
    collections = ['ingresos', 'gastos', 'categorias', 'branches', 'inventarios', 'compras']
) => {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    // Contador para saber cuántas colecciones han cargado exitosamente
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
                // 1. Actualiza la data
                setData(prev => ({ ...prev, [col]: list }));
                
                // 2. Incrementa el contador SÓLO si la colección es nueva o está siendo escuchada por primera vez
                setLoadedCount(prev => {
                    const newCount = prev + (prev < collections.length ? 1 : 0);
                    // Si ya cargaron todas, desactiva el loading
                    if (newCount === collections.length && mounted) {
                        setLoading(false);
                    }
                    return newCount;
                });
            }, (error) => {
                // 3. CRÍTICO: En caso de error de permiso (400), forzamos la salida del loading.
                console.error(`🚨 Error al cargar la colección ${col}. Esto es un error de PERMISOS de Firebase.`, error);
                if (mounted) {
                    setLoading(false); 
                    // Si no puede cargar una, ya no tiene sentido esperar a las demás
                }
            });
            unsubscribes.push(unsubscribe);
        });
        
        return () => { 
            mounted = false;
            unsubscribes.forEach(unsub => unsub());
        };
    }, [collections.length]); // Dependencia fija: la longitud de colecciones
    
    // Si la carga falla por completo, pero loading es false, podemos mostrar un error
    const dataIsPopulated = Object.keys(data).length > 0 && loadedCount > 0;

    return { data, loading, dataIsPopulated };
};

function App() {

const { data: appData, loading: dataLoading, dataIsPopulated } = useAppData();

    // Las categorías (asumimos que appData.categorias trae la lista de Firebase)
    const categoriesList = appData.categorias || [];
    
    // 👇 CORRECCIÓN CLAVE: Si appData.branches está vacío o undefined, 
    // usamos la constante estática BRANCHES como fallback.
    const branchesList = (appData.branches && appData.branches.length > 0) 
        ? appData.branches 
        : BRANCHES;

  if (dataLoading) {
      return (
          <div className="flex justify-center items-center min-h-screen bg-gray-50">
              <div className="text-xl font-medium text-blue-600">Cargando datos de la SuperApp...</div>
          </div>
      );
  }
  
  // Si no está cargando y no hay datos, muestra el error de permisos.
  if (!dataLoading && !dataIsPopulated) {
       return (
          <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 p-4">
              <h1 className="text-4xl font-extrabold text-red-800">🚨 ERROR CRÍTICO DE CONEXIÓN</h1>
              <p className="mt-4 text-xl text-red-600 text-center">
                  La aplicación no pudo cargar ninguna colección de Firebase (Error 400 recurrente).
              </p>
              <p className="mt-2 text-lg text-red-600 text-center font-bold">
                  Por favor, ve a la consola de Firebase y publica la regla <code className="bg-red-200 p-1 rounded">allow read, write: if true;</code> para probar.
              </p>
              <p className="mt-2 text-sm text-red-500">
                  Asegúrate de haber limpiado la caché IndexedDB en tu navegador antes de iniciar sesión.
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

                        {/* 1. Dashboard / Inicio */}
                        <Route 
                            path="/" 
                            element={<PrivateRoute element={<Dashboard />} />} 
                        />
                        
                        {/* 2. Ruta ÚNICA para Ingreso de Datos */}
                        <Route 
                            path="/ingresar" 
                            element={<PrivateRoute 
                                element={<DataEntry 
                                    data={appData} 
                                    categories={categoriesList} // <-- Pasa la lista garantizada
                                    branches={branchesList} 
                                   
                                />} 
                            />} 
                        />
                        
                        {/* 3. Conciliación Bancaria */}
                        <Route 
                            path="/conciliacion" 
                            element={<PrivateRoute element={<BankReconciliation />} />} 
                        />

                        {/* 4. Reportes */}
                        <Route 
                            path="/reportes" 
                            element={<PrivateRoute 
                                element={<Reports 
                                    data={appData} 
                                    categories={categoriesList} // <-- Pasa la lista garantizada
                                />} 
                            />} 
                        />

                        {/* 5. Gestión de Catálogos y Maestros */}
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