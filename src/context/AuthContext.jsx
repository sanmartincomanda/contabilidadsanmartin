// src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase'; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const AuthContext = createContext();

// 1. Exportación clave: Hook personalizado para usar la autenticación
// Este hook debe ser exportado para que Login.jsx pueda usarlo.
export const useAuth = () => useContext(AuthContext); // <-- Asegúrate de tener 'export' aquí

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Efecto que escucha los cambios de estado de Firebase Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser); 
            setLoading(false);
        });
        return () => unsubscribe(); 
    }, []);

    // Funciones de Autenticación
    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        user,
        loading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {/* Solo renderiza los hijos cuando el estado de autenticación haya cargado */}
            {!loading && children} 
        </AuthContext.Provider>
    );
};

// Nota: La exportación 'AuthProvider' ya se realiza con 'export const AuthProvider'.
// Si tu App.jsx la importa como 'default', cámbiala a:
// export default AuthProvider;
// Sin embargo, mantener 'export const AuthProvider' es más consistente.