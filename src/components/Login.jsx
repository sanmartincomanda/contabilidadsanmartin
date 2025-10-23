// src/components/Login.jsx

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
            navigate('/'); // Redirigir al Dashboard
        } catch (e) {
            // Manejo de errores de Firebase Auth mejorado
            let errorMessage = 'Error al iniciar sesión. Verifique credenciales o conexión.';
            if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                errorMessage = 'Credenciales inválidas.';
            } else if (e.code === 'auth/invalid-email') {
                errorMessage = 'Formato de correo inválido.';
            }
            setError(errorMessage);
            console.error("Error de Login:", e);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                
                {/* ESPACIO PARA EL LOGO (usando la ruta /logo.png de la carpeta public) */}
                <div className="flex justify-center mb-6">
                    <img 
                        src="/logo.png" 
                        alt="Logo de la Aplicación" 
                        className="h-16 w-auto" // Ajusta el tamaño de la imagen si es necesario
                    />
                </div>

                <h2 className="text-center text-3xl font-extrabold text-gray-900">
                    Bienvenido a Sistema Contable SR
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Inicie sesión para acceder a la plataforma.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
                    
                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md border border-red-200">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        
                        {/* Campo de Correo */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Correo Electrónico
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoggingIn}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Campo de Contraseña */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Contraseña
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoggingIn}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                        
                        {/* Botón de Ingreso */}
                        <div>
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition duration-150"
                            >
                                {isLoggingIn ? 'Ingresando...' : 'Iniciar Sesión'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}