# Tablero de Utilidad por Sucursal — Carnes San Martín

App React (Vite + Tailwind) para calcular utilidad por sucursal con la fórmula:
**UTILIDAD SUCURSAL = VENTAS – (COMPRAS × %VENTA) ± AJUSTE INVENTARIO – GASTOS**

## Requisitos
- Node 18+ y npm

## Instalación
```bash
npm install
npm run dev
```

Abrí http://localhost:5173

## Build de producción
```bash
npm run build
npm run preview
```

## Carga CSV
Formato esperado: columnas `branch, amount` (o `sucursal, monto`). Los nombres se vinculan automáticamente con la lista de sucursales; si no existe, la crea.
