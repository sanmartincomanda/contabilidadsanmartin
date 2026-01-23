// src/components/Header.jsx

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import React, { useState } from 'react';

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false); 

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
                <Link to="/" className="text-xl font-bold hover:text-blue-400">
                    SuperApp
                </Link>
                
                {user && ( 
                    <div className="space-x-4 flex items-center text-sm">
                        <NavLink to="/">Inicio</NavLink>
                        
                        {/* INICIO DEL MENÚ DESPLEGABLE 'INGRESAR' */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="px-3 py-1 hover:text-blue-300 transition-colors rounded flex items-center"
                            >
                                Ingresar
                                <svg className={`w-3 h-3 ml-1 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            
                            {isMenuOpen && (
                                <div 
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20"
                                    onMouseLeave={() => setIsMenuOpen(false)} 
                                >
                                    <DropdownItem to="/ingresar?tab=Ingresos">Ingresos</DropdownItem>
                                    <DropdownItem to="/ingresar?tab=Gastos">Gastos</DropdownItem>
                                    <DropdownItem to="/ingresar?tab=Inventario">Inventario</DropdownItem>
                                </div>
                            )}
                        </div>
                        {/* FIN DEL MENÚ DESPLEGABLE 'INGRESAR' */}

                        <NavLink to="/conciliacion">Conciliación</NavLink>
                        
                        {/* NUEVO LINK: CUENTAS POR PAGAR */}
                        <NavLink to="/cuentas-pagar">Cuentas por Pagar</NavLink>
                        
                        <NavLink to="/reportes">Reportes</NavLink>
                        
                        <NavLink to="/maestros/categorias">Categorías</NavLink>
                        
                        <button 
                            onClick={handleLogout}
                            className='bg-red-600 px-3 py-1 rounded text-sm font-semibold hover:bg-red-700 transition'
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                )}
                
                {!user && ( 
                    <Link to="/login" className="hover:text-blue-400">Iniciar Sesión</Link>
                )}
            </div>
        </nav>
    );
}