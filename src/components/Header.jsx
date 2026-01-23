// src/components/Header.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import React, { useState } from 'react';

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false); 

    // VALIDACIÓN DE USUARIO LIMITADO
    const isLimitedUser = user?.email === "adriandiazc95@gmail.com";

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (e) {
            console.error("Error al cerrar sesión", e);
        }
    };

    const NavLink = ({ to, children }) => (
        <Link 
            to={to} 
            className="px-3 py-1 hover:text-blue-300 transition-colors rounded"
        >
            {children}
        </Link>
    );

    const DropdownItem = ({ to, children }) => (
        <Link 
            to={to} 
            onClick={() => setIsMenuOpen(false)} 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
        >
            {children}
        </Link>
    );

    return (
        <nav className="bg-gray-800 p-4 text-white shadow-lg sticky top-0 z-10">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-xl font-bold hover:text-blue-400">FinanzasApp</Link>
                
                {user && ( 
                    <div className="space-x-4 flex items-center">
                        <NavLink to="/">Inicio</NavLink>

                        {/* EL MENÚ 'INGRESAR' SOLO SE MUESTRA SI NO ES EL USUARIO LIMITADO */}
                        {!isLimitedUser && (
                            <div className="relative inline-block text-left">
                                <button 
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="px-3 py-1 bg-blue-700 rounded hover:bg-blue-600 transition flex items-center"
                                >
                                    Ingresar ▾
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                        <div className="py-1" onClick={() => setIsMenuOpen(false)}>
                                            <DropdownItem to="/ingresar?tab=Ingresos">Ingresos</DropdownItem>
                                            <DropdownItem to="/ingresar?tab=Gastos">Gastos</DropdownItem>
                                            <DropdownItem to="/ingresar?tab=Inventario">Inventario</DropdownItem>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RUTAS SIEMPRE VISIBLES O SEGÚN TU PREFERENCIA */}
                        <NavLink to="/cuentas-pagar">Cuentas por Pagar</NavLink>

                        {/* REPORTES Y CATEGORÍAS OCULTOS PARA EL USUARIO LIMITADO */}
                        {!isLimitedUser && (
                            <>
                                <NavLink to="/conciliacion">Conciliación</NavLink>
                                <NavLink to="/reportes">Reportes</NavLink>
                                <NavLink to="/maestros/categorias">Categorías</NavLink>
                            </>
                        )}
                        
                        <div className="flex items-center ml-4 border-l border-gray-600 pl-4">
                            <span className="text-xs mr-4 text-gray-400">{user.email}</span>
                            <button 
                                onClick={handleLogout}
                                className='bg-red-600 px-3 py-1 rounded text-sm font-semibold hover:bg-red-700 transition'
                            >
                                Salir
                            </button>
                        </div>
                    </div>
                )}
                
                {!user && ( 
                    <Link to="/login" className="hover:text-blue-400">Iniciar Sesión</Link>
                )}
            </div>
        </nav>
    );
}