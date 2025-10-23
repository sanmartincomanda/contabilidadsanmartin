// src/constants.js

// 1. Constantes de Categorías (Añadido desde ExpenseTracker)
export const CATEGORIES = ['Alquiler', 'Servicios', 'Sueldos', 'Compra Inventario', 'Mantenimiento', 'Marketing', 'Otros'];

// 2. Constantes de Sucursales (BRANCHES)
export const BRANCHES = [
    { id: 'granada', name: 'Distribuidora Granada San Martín Granada' },
    { id: 'amparito', name: 'Carnes Amparito' },
    { id: 'inmaculada', name: 'Distribuidora Granada Inmaculada (en proceso)' },
    { id: 'ruta1', name: 'Ruta 1' },
    { id: 'ruta2', name: 'Ruta 2' },
    { id: 'ruta3', name: 'Ruta 3' },
    { id: 'masaya', name: 'Masaya Gold' },
    { id: 'masaya2', name: 'Masaya Mercado' },
];

// 3. Constantes de Columnas para Carga CSV
export const GASTOS_CSV_COLUMNS = ['Fecha', 'Descripcion', 'Categoria', 'Monto', 'Sucursal'];

// 4. Utilidades generales
export const peso = (n) => (isNaN(n) || n === null || n === '' ? 0 : Number(n));

export const fmt = (n, currency = 'C$') =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// 5. Utilidad para obtener el nombre de la sucursal (Añadido desde ExpenseTracker)
export const branchName = (id) => BRANCHES.find(b => b.id === id)?.name || id;