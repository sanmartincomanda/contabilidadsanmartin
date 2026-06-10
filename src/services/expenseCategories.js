export const EXPENSE_CATEGORY_TREE = [
    {
        category: 'Costos de venta / compras',
        subcategories: [
            'Compra de carne de res',
            'Compra de cerdo',
            'Compra de pollo',
            'Compra de embutidos',
            'Compra de mariscos',
            'Compra de productos procesados',
            'Fletes sobre compras',
            'Material de empaque directo',
            'Hielo y conservacion directa',
            'Merma / ajuste de inventario',
            'Otros costos de producto',
        ],
    },
    {
        category: 'Gastos de Nomina',
        subcategories: [
            'Sueldos y salarios',
            'Horas extras',
            'Bonificaciones',
            'Aguinaldo',
            'Vacaciones',
            'Indemnizacion',
            'INSS patronal',
            'INATEC',
            'Alimentacion de personal',
            'Uniformes',
            'Capacitacion',
            'Viaticos de personal',
        ],
    },
    {
        category: 'Gastos del Local',
        subcategories: [
            'Alquiler',
            'Energia electrica',
            'Agua potable',
            'Internet y telefonia',
            'Servicios publicos varios',
            'Mantenimiento del local',
            'Reparaciones menores',
            'Seguridad',
            'Fumigacion',
            'Limpieza',
            'Recoleccion de basura',
            'Vigilancia / monitoreo',
        ],
    },
    {
        category: 'Equipos y Operacion de Carniceria',
        subcategories: [
            'Mantenimiento de cuartos frios',
            'Mantenimiento de vitrinas refrigeradas',
            'Mantenimiento de sierras y molinos',
            'Mantenimiento general de equipos',
            'Repuestos de equipos',
            'Gas refrigerante',
            'Herramientas de corte',
            'Cuchillos y afilado',
            'Balanzas y calibracion',
            'Equipos menores',
            'Higiene y seguridad alimentaria',
        ],
    },
    {
        category: 'Gastos de venta - Operaciones',
        subcategories: [
            'Bolsas y empaques',
            'Etiquetas',
            'Publicidad',
            'Promociones',
            'Comisiones de venta',
            'Delivery / reparto',
            'Combustible de reparto',
            'Mantenimiento de vehiculo',
            'Parqueo y peajes',
            'Atencion al cliente',
            'Degustaciones / muestras',
            'Otros gastos de venta',
        ],
    },
    {
        category: 'Gastos Administrativos',
        subcategories: [
            'Papeleria y utiles',
            'Servicios contables',
            'Servicios legales',
            'Software y sistemas',
            'Suscripciones',
            'Mensajeria',
            'Gastos de oficina',
            'Caja chica',
            'Diferencias de caja',
            'Tramites administrativos',
        ],
    },
    {
        category: 'Impuestos, Permisos y Tasas',
        subcategories: [
            'Matricula municipal',
            'Impuesto municipal sobre ingresos',
            'Permisos MINSA',
            'Permisos alcaldia',
            'Licencias y registros',
            'Timbres fiscales',
            'Multas y recargos',
            'Otros impuestos y tasas',
        ],
    },
    {
        category: 'Gastos Financieros',
        subcategories: [
            'Comisiones bancarias',
            'Cargos POS',
            'Intereses bancarios',
            'Comisiones por transferencias',
            'Diferencial cambiario',
            'Otros gastos financieros',
        ],
    },
    {
        category: 'Otros Gastos',
        subcategories: [
            'Donaciones',
            'Gastos no deducibles',
            'Perdidas por robo',
            'Perdidas por deterioro',
            'Ajustes varios',
            'Gastos extraordinarios',
            'Otros gastos',
        ],
    },
];

const normalizeText = (value) => (
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
);

export const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORY_TREE.map((item) => item.category);

export const PURCHASE_CATEGORY = 'Costos de venta / compras';
export const DEFAULT_EXPENSE_CATEGORY = 'Otros Gastos';
export const DEFAULT_EXPENSE_SUBCATEGORY = 'Otros gastos';

const directCategoryMap = new Map(
    EXPENSE_CATEGORY_TREE.map((item) => [normalizeText(item.category), item.category])
);

const directSubcategoryMap = new Map(
    EXPENSE_CATEGORY_TREE.flatMap((item) => (
        item.subcategories.map((subcategory) => [
            `${normalizeText(item.category)}|${normalizeText(subcategory)}`,
            subcategory,
        ])
    ))
);

export const LEGACY_CATEGORY_MAPPINGS = [
    { from: 'Alquiler', category: 'Gastos del Local', subcategory: 'Alquiler' },
    { from: 'Servicios', category: 'Gastos del Local', subcategory: 'Servicios publicos varios' },
    { from: 'Sueldos', category: 'Gastos de Nomina', subcategory: 'Sueldos y salarios' },
    { from: 'Gastos de Personal', category: 'Gastos de Nomina', subcategory: 'Sueldos y salarios' },
    { from: 'Compra Inventario', category: 'Costos de venta / compras', subcategory: 'Otros costos de producto' },
    { from: 'Compra', category: 'Costos de venta / compras', subcategory: 'Otros costos de producto' },
    { from: 'Mantenimiento', category: 'Equipos y Operacion de Carniceria', subcategory: 'Mantenimiento general de equipos' },
    { from: 'Marketing', category: 'Gastos de venta - Operaciones', subcategory: 'Publicidad' },
    { from: 'Gastos de Venta', category: 'Gastos de venta - Operaciones', subcategory: 'Otros gastos de venta' },
    { from: 'Otros', category: 'Otros Gastos', subcategory: 'Otros gastos' },
];

const legacyMap = new Map(
    LEGACY_CATEGORY_MAPPINGS.map((item) => [normalizeText(item.from), item])
);

const keywordRules = [
    { words: ['inss'], category: 'Gastos de Nomina', subcategory: 'INSS patronal' },
    { words: ['inatec'], category: 'Gastos de Nomina', subcategory: 'INATEC' },
    { words: ['nomina', 'planilla', 'salario', 'sueldo'], category: 'Gastos de Nomina', subcategory: 'Sueldos y salarios' },
    { words: ['hora extra'], category: 'Gastos de Nomina', subcategory: 'Horas extras' },
    { words: ['aguinaldo'], category: 'Gastos de Nomina', subcategory: 'Aguinaldo' },
    { words: ['vacacion'], category: 'Gastos de Nomina', subcategory: 'Vacaciones' },
    { words: ['alquiler', 'renta'], category: 'Gastos del Local', subcategory: 'Alquiler' },
    { words: ['energia', 'luz', 'electrica'], category: 'Gastos del Local', subcategory: 'Energia electrica' },
    { words: ['agua'], category: 'Gastos del Local', subcategory: 'Agua potable' },
    { words: ['internet', 'telefono', 'claro', 'tigo'], category: 'Gastos del Local', subcategory: 'Internet y telefonia' },
    { words: ['fumigacion'], category: 'Gastos del Local', subcategory: 'Fumigacion' },
    { words: ['limpieza'], category: 'Gastos del Local', subcategory: 'Limpieza' },
    { words: ['basura'], category: 'Gastos del Local', subcategory: 'Recoleccion de basura' },
    { words: ['seguridad', 'vigilancia'], category: 'Gastos del Local', subcategory: 'Seguridad' },
    { words: ['cuarto frio'], category: 'Equipos y Operacion de Carniceria', subcategory: 'Mantenimiento de cuartos frios' },
    { words: ['vitrina'], category: 'Equipos y Operacion de Carniceria', subcategory: 'Mantenimiento de vitrinas refrigeradas' },
    { words: ['sierra', 'molino'], category: 'Equipos y Operacion de Carniceria', subcategory: 'Mantenimiento de sierras y molinos' },
    { words: ['gas refrigerante'], category: 'Equipos y Operacion de Carniceria', subcategory: 'Gas refrigerante' },
    { words: ['cuchillo', 'afilado'], category: 'Equipos y Operacion de Carniceria', subcategory: 'Cuchillos y afilado' },
    { words: ['balanza'], category: 'Equipos y Operacion de Carniceria', subcategory: 'Balanzas y calibracion' },
    { words: ['bolsa', 'empaque'], category: 'Gastos de venta - Operaciones', subcategory: 'Bolsas y empaques' },
    { words: ['etiqueta'], category: 'Gastos de venta - Operaciones', subcategory: 'Etiquetas' },
    { words: ['publicidad', 'marketing'], category: 'Gastos de venta - Operaciones', subcategory: 'Publicidad' },
    { words: ['delivery', 'reparto'], category: 'Gastos de venta - Operaciones', subcategory: 'Delivery / reparto' },
    { words: ['combustible', 'gasolina', 'diesel'], category: 'Gastos de venta - Operaciones', subcategory: 'Combustible de reparto' },
    { words: ['vehiculo', 'camioneta', 'moto'], category: 'Gastos de venta - Operaciones', subcategory: 'Mantenimiento de vehiculo' },
    { words: ['papeleria', 'utiles'], category: 'Gastos Administrativos', subcategory: 'Papeleria y utiles' },
    { words: ['contador', 'contable', 'contabilidad'], category: 'Gastos Administrativos', subcategory: 'Servicios contables' },
    { words: ['legal', 'abogado'], category: 'Gastos Administrativos', subcategory: 'Servicios legales' },
    { words: ['software', 'sistema', 'suscripcion'], category: 'Gastos Administrativos', subcategory: 'Software y sistemas' },
    { words: ['caja chica'], category: 'Gastos Administrativos', subcategory: 'Caja chica' },
    { words: ['alcaldia', 'matricula municipal'], category: 'Impuestos, Permisos y Tasas', subcategory: 'Matricula municipal' },
    { words: ['impuesto municipal', 'imi'], category: 'Impuestos, Permisos y Tasas', subcategory: 'Impuesto municipal sobre ingresos' },
    { words: ['minsa'], category: 'Impuestos, Permisos y Tasas', subcategory: 'Permisos MINSA' },
    { words: ['permiso'], category: 'Impuestos, Permisos y Tasas', subcategory: 'Permisos alcaldia' },
    { words: ['multa', 'recargo'], category: 'Impuestos, Permisos y Tasas', subcategory: 'Multas y recargos' },
    { words: ['banco', 'bancaria'], category: 'Gastos Financieros', subcategory: 'Comisiones bancarias' },
    { words: ['pos'], category: 'Gastos Financieros', subcategory: 'Cargos POS' },
    { words: ['interes'], category: 'Gastos Financieros', subcategory: 'Intereses bancarios' },
    { words: ['transferencia'], category: 'Gastos Financieros', subcategory: 'Comisiones por transferencias' },
    { words: ['robo'], category: 'Otros Gastos', subcategory: 'Perdidas por robo' },
    { words: ['deterioro'], category: 'Otros Gastos', subcategory: 'Perdidas por deterioro' },
    { words: ['donacion'], category: 'Otros Gastos', subcategory: 'Donaciones' },
];

export const getExpenseSubcategories = (category) => (
    EXPENSE_CATEGORY_TREE.find((item) => item.category === category)?.subcategories || []
);

export const getDefaultSubcategory = (category) => (
    getExpenseSubcategories(category)[0] || DEFAULT_EXPENSE_SUBCATEGORY
);

const resolveKnownCategory = (category) => {
    const normalized = normalizeText(category);
    return directCategoryMap.get(normalized) || legacyMap.get(normalized)?.category || '';
};

const resolveKnownSubcategory = (category, subcategory) => {
    if (!category || !subcategory) return '';
    return directSubcategoryMap.get(`${normalizeText(category)}|${normalizeText(subcategory)}`) || '';
};

const inferFromText = (text) => {
    const normalized = normalizeText(text);
    return keywordRules.find((rule) => rule.words.some((word) => normalized.includes(normalizeText(word))));
};

export const normalizeExpenseClassification = ({
    category,
    subcategory,
    description,
    supplier,
    type,
} = {}) => {
    const candidateText = [category, subcategory, description, supplier, type].filter(Boolean).join(' ');
    const directCategory = resolveKnownCategory(category);
    const directSubcategory = resolveKnownSubcategory(directCategory, subcategory);

    if (directCategory && directSubcategory) {
        return { category: directCategory, subcategory: directSubcategory };
    }

    if (directCategory) {
        const legacy = legacyMap.get(normalizeText(category));
        return {
            category: directCategory,
            subcategory: legacy?.subcategory || directSubcategory || getDefaultSubcategory(directCategory),
        };
    }

    const inferred = inferFromText(candidateText);
    if (inferred) {
        return { category: inferred.category, subcategory: inferred.subcategory };
    }

    return {
        category: DEFAULT_EXPENSE_CATEGORY,
        subcategory: DEFAULT_EXPENSE_SUBCATEGORY,
    };
};

export const getExpenseCategoryKey = (item = {}) => {
    const classification = normalizeExpenseClassification(item);
    return `${classification.category} / ${classification.subcategory}`;
};

export const getLegacyCategoryMappingRows = () => LEGACY_CATEGORY_MAPPINGS.map((item) => ({
    anterior: item.from,
    nuevaCategoria: item.category,
    nuevaSubcategoria: item.subcategory,
}));
