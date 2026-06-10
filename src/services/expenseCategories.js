export const EXPENSE_CATEGORY_TREE = [
    {
        category: 'Costos de venta / compras',
        subcategories: [
            'Compra de carne res',
            'Compra de cerdo',
            'Compra de pollo',
            'Compra de embutidos',
            'Compra de mariscos',
            'Compra de productos procesados',
            'Fletes sobre compras',
            'Merma / ajuste de inventario',
            'Material de empaque directo',
            'Hielo / conservacion directa',
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
export const DEFAULT_PURCHASE_SUBCATEGORY = 'Otros costos de producto';

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

const purchaseSubcategoryAliases = new Map(
    [
        ['Compra de carne de res', 'Compra de carne res'],
        ['Carne de res', 'Compra de carne res'],
        ['Compra res', 'Compra de carne res'],
        ['Res', 'Compra de carne res'],
        ['Hielo y conservacion directa', 'Hielo / conservacion directa'],
    ].map(([from, to]) => [normalizeText(from), to])
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

const purchaseKeywordRules = [
    {
        subcategory: 'Fletes sobre compras',
        words: ['flete', 'fletes', 'transporte de compra', 'acarreo', 'envio proveedor', 'freight'],
    },
    {
        subcategory: 'Merma / ajuste de inventario',
        words: ['merma', 'ajuste inventario', 'ajuste de inventario', 'diferencia inventario', 'descarte', 'perdida producto'],
    },
    {
        subcategory: 'Material de empaque directo',
        words: ['material de empaque', 'empaque directo', 'bolsa', 'bolsas', 'bandeja', 'plastico', 'film', 'stretch', 'termoencogible', 'etiqueta'],
    },
    {
        subcategory: 'Hielo / conservacion directa',
        words: ['hielo', 'conservacion', 'conservacion directa', 'refrigerante', 'gel pack', 'cooler'],
    },
    {
        subcategory: 'Compra de embutidos',
        words: ['embutido', 'embutidos', 'chorizo', 'salchicha', 'hot dog', 'hotdog', 'jamon', 'mortadela', 'tocino', 'embutidos de la casa', 'delmor'],
    },
    {
        subcategory: 'Compra de pollo',
        words: ['pollo', 'gallina', 'pechuga', 'muslo', 'pierna de pollo', 'ala', 'alita', 'cargill', 'tip top', 'pollo la china'],
    },
    {
        subcategory: 'Compra de cerdo',
        words: ['cerdo', 'porcino', 'chancho', 'pork', 'chuleta', 'costilla de cerdo', 'lomo de cerdo', 'pierna de cerdo'],
    },
    {
        subcategory: 'Compra de mariscos',
        words: ['marisco', 'mariscos', 'pescado', 'camaron', 'tilapia', 'filete pescado', 'calamar', 'jaiba', 'langosta'],
    },
    {
        subcategory: 'Compra de productos procesados',
        words: ['procesado', 'procesados', 'hamburguesa', 'nugget', 'croqueta', 'torta', 'sazonado', 'preparado', 'ahumado', 'molinos de nicaragua', 'harina', 'condimento'],
    },
    {
        subcategory: 'Compra de carne res',
        words: ['carne de res', 'carne res', 'bovino', 'vaca', 'novillo', 'canal', 'posta', 'posta trasera', 'posta pierna', 'churrasco', 'lomo de res', 'molida', 'costilla', 'cecina', 'hueso corriente', 'mondongo', 'tripa', 'tiras p asar', 'carnes san martin', 'joksan reyes', 'lugar de bendicion'],
    },
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
    const normalizedSubcategory = normalizeText(subcategory);
    const direct = directSubcategoryMap.get(`${normalizeText(category)}|${normalizedSubcategory}`);
    if (direct) return direct;

    const alias = purchaseSubcategoryAliases.get(normalizedSubcategory);
    if (!alias) return '';
    return directSubcategoryMap.get(`${normalizeText(category)}|${normalizeText(alias)}`) || '';
};

const inferFromText = (text) => {
    const normalized = normalizeText(text);
    return keywordRules.find((rule) => rule.words.some((word) => normalized.includes(normalizeText(word))));
};

const inferPurchaseFromText = (text) => {
    const normalized = normalizeText(text);
    return purchaseKeywordRules.find((rule) => rule.words.some((word) => normalized.includes(normalizeText(word))));
};

const stringifyPurchaseText = (value, depth = 0) => {
    if (value === null || value === undefined || depth > 2) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map((entry) => stringifyPurchaseText(entry, depth + 1)).join(' ');
    if (typeof value === 'object') {
        return Object.entries(value)
            .filter(([key]) => !['timestamp', 'createdAt', 'updatedAt'].includes(key))
            .map(([key, entry]) => `${key} ${stringifyPurchaseText(entry, depth + 1)}`)
            .join(' ');
    }
    return '';
};

const extractKnownPurchaseSubcategory = (item = {}) => {
    const candidates = [
        item.subcategory,
        item.subcategoria,
        item.subCategory,
        item.categoryKey,
        item.categoriaSubcategoria,
        item.category,
        item.categoria,
    ].filter(Boolean);

    for (const candidate of candidates) {
        const candidateText = String(candidate);
        const possibleSubcategory = candidateText.includes(' / ')
            ? candidateText.split(' / ').pop()
            : candidateText;
        const knownSubcategory = resolveKnownSubcategory(PURCHASE_CATEGORY, possibleSubcategory);
        if (knownSubcategory) return knownSubcategory;
    }

    return '';
};

export const inferPurchaseSubcategory = (item = {}, fallback = DEFAULT_PURCHASE_SUBCATEGORY) => {
    const explicitSubcategory = extractKnownPurchaseSubcategory(item);
    if (explicitSubcategory) return explicitSubcategory;

    const text = [
        item.description,
        item.descripcion,
        item.detalle,
        item.concepto,
        item.notes,
        item.nota,
        item.supplier,
        item.proveedor,
        item.vendor,
        item.nombre_proveedor,
        item.invoiceNumber,
        item.numero,
        item.folio,
        item.purchaseFolio,
        item.purchaseSeries,
        item.tipo,
        item.type,
        stringifyPurchaseText(item.items || item.productos || item.lineas || item.lines || item.detalleProductos),
        stringifyPurchaseText(item.raw || item.source || item.sicar),
    ].filter(Boolean).join(' ');

    const inferred = inferPurchaseFromText(text);
    if (inferred) return inferred.subcategory;

    return resolveKnownSubcategory(PURCHASE_CATEGORY, fallback) || DEFAULT_PURCHASE_SUBCATEGORY;
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
        if (directCategory === PURCHASE_CATEGORY) {
            return {
                category: directCategory,
                subcategory: inferPurchaseSubcategory(
                    { category, subcategory, description, supplier, type },
                    legacy?.subcategory || DEFAULT_PURCHASE_SUBCATEGORY
                ),
            };
        }
        return {
            category: directCategory,
            subcategory: legacy?.subcategory || directSubcategory || getDefaultSubcategory(directCategory),
        };
    }

    if (normalizeText(type).includes('compra')) {
        return {
            category: PURCHASE_CATEGORY,
            subcategory: inferPurchaseSubcategory({ category, subcategory, description, supplier, type }),
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
