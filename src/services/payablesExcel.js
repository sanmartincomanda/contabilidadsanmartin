const EXCEL_COLUMNS_COUNT = 11;
const CURRENCY_FORMAT = '"C$" #,##0.00';
const DATE_FORMAT = 'dd/mm/yyyy';

const textCell = (value, extra = {}) => ({
    value: String(value ?? ''),
    type: String,
    format: '@',
    alignVertical: 'center',
    ...extra,
});

const numberCell = (value, extra = {}) => ({
    value: Number(value || 0),
    type: Number,
    format: CURRENCY_FORMAT,
    align: 'right',
    alignVertical: 'center',
    ...extra,
});

const parseExcelDate = (value) => {
    const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
};

const dateCell = (value) => {
    const date = parseExcelDate(value);
    return date
        ? { value: date, type: Date, format: DATE_FORMAT, align: 'center', alignVertical: 'center' }
        : textCell('');
};

const headerCell = (value) => ({
    value,
    type: String,
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    backgroundColor: '#0F3557',
    align: 'center',
    alignVertical: 'center',
    wrap: true,
    height: 28,
    bottomBorderColor: '#0A628F',
    bottomBorderStyle: 'medium',
});

const dataCellBorder = {
    bottomBorderColor: '#D7E2E9',
    bottomBorderStyle: 'thin',
};

const getStatusStyle = (status) => {
    if (status === 'pagada') return { backgroundColor: '#ECFDF3', textColor: '#047857' };
    if (status === 'vencida') return { backgroundColor: '#FEF2F2', textColor: '#B42318' };
    return { backgroundColor: '#EFF8FF', textColor: '#075EA8' };
};

const sanitizeFilePart = (value) => (
    String(value || 'empresa')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
        .slice(0, 50) || 'empresa'
);

const getFilterSummary = (filters = {}) => {
    const activeFilters = [];
    if (filters.proveedor) activeFilters.push(`Proveedor: ${filters.proveedor}`);
    if (filters.factura) activeFilters.push(`Factura: ${filters.factura}`);
    if (filters.fechaDesde) activeFilters.push(`Desde: ${filters.fechaDesde}`);
    if (filters.fechaHasta) activeFilters.push(`Hasta: ${filters.fechaHasta}`);
    if (filters.estado && filters.estado !== 'todos') activeFilters.push(`Estado: ${filters.estado}`);
    return activeFilters.length ? activeFilters.join(' | ') : 'Sin filtros: todas las facturas de credito';
};

export const buildPayablesExcel = ({ invoices = [], companyName, filters, generatedOn }) => {
    const titleRow = [
        {
            value: `FACTURAS DE CREDITO - ${String(companyName || '').toUpperCase()}`,
            type: String,
            columnSpan: EXCEL_COLUMNS_COUNT,
            fontWeight: 'bold',
            fontSize: 16,
            textColor: '#FFFFFF',
            backgroundColor: '#152533',
            align: 'left',
            alignVertical: 'center',
            height: 34,
        },
        ...Array(EXCEL_COLUMNS_COUNT - 1).fill(null),
    ];

    const metadataRow = [
        {
            value: `Generado: ${generatedOn} | Registros: ${invoices.length}`,
            type: String,
            columnSpan: EXCEL_COLUMNS_COUNT,
            textColor: '#45606D',
            backgroundColor: '#EAF7FC',
            alignVertical: 'center',
            height: 22,
        },
        ...Array(EXCEL_COLUMNS_COUNT - 1).fill(null),
    ];

    const filterRow = [
        {
            value: getFilterSummary(filters),
            type: String,
            columnSpan: EXCEL_COLUMNS_COUNT,
            textColor: '#607888',
            backgroundColor: '#F7FBFD',
            wrap: true,
            alignVertical: 'center',
            height: 24,
        },
        ...Array(EXCEL_COLUMNS_COUNT - 1).fill(null),
    ];

    const headers = [
        'Tipo',
        'Factura',
        'Fecha emision',
        'Proveedor',
        'Vencimiento',
        'Estado',
        'Monto C$',
        'Abonado C$',
        'Saldo C$',
        'Sucursal',
        'Comprobantes',
    ].map(headerCell);

    const rows = invoices.map((invoice, index) => {
        const attachmentUrls = Array.isArray(invoice.exportAttachmentUrls)
            ? invoice.exportAttachmentUrls.filter(Boolean)
            : [];
        const type = invoice.exportType || 'Compra';
        const status = invoice.statusInfo?.status || '';
        const zebraBackground = index % 2 === 1 ? '#F8FBFD' : '#FFFFFF';
        const rowStyle = { ...dataCellBorder, backgroundColor: zebraBackground };

        return [
            textCell(type, {
                ...rowStyle,
                fontWeight: 'bold',
                textColor: type === 'Gasto' ? '#075EA8' : '#45606D',
            }),
            textCell(invoice.numero || 'S/N', { ...rowStyle, fontWeight: 'bold' }),
            { ...dateCell(invoice.fecha), ...rowStyle },
            textCell(invoice.proveedor, { ...rowStyle, wrap: true }),
            { ...dateCell(invoice.vencimiento), ...rowStyle },
            textCell(invoice.statusInfo?.label || invoice.estado || '', {
                ...rowStyle,
                ...getStatusStyle(status),
                fontWeight: 'bold',
                align: 'center',
            }),
            numberCell(invoice.monto, rowStyle),
            numberCell(invoice.yaAbonado, { ...rowStyle, textColor: '#047857' }),
            numberCell(invoice.saldo, { ...rowStyle, fontWeight: 'bold', textColor: '#A81D24' }),
            textCell(invoice.branchName || invoice.sucursal || companyName, { ...rowStyle, wrap: true }),
            textCell(attachmentUrls.join('\n'), {
                ...rowStyle,
                textColor: attachmentUrls.length ? '#075EA8' : '#98A2B3',
                wrap: true,
            }),
        ];
    });

    const firstDataRow = 6;
    const lastDataRow = firstDataRow + invoices.length - 1;
    const totalStyle = {
        fontWeight: 'bold',
        backgroundColor: '#EAF7FC',
        topBorderColor: '#0A628F',
        topBorderStyle: 'medium',
        alignVertical: 'center',
        height: 26,
    };
    const totalRow = [
        { value: 'TOTALES', type: String, columnSpan: 6, ...totalStyle },
        ...Array(5).fill(null),
        {
            value: `=SUM(G${firstDataRow}:G${lastDataRow})`,
            type: 'Formula',
            format: CURRENCY_FORMAT,
            align: 'right',
            ...totalStyle,
        },
        {
            value: `=SUM(H${firstDataRow}:H${lastDataRow})`,
            type: 'Formula',
            format: CURRENCY_FORMAT,
            align: 'right',
            textColor: '#047857',
            ...totalStyle,
        },
        {
            value: `=SUM(I${firstDataRow}:I${lastDataRow})`,
            type: 'Formula',
            format: CURRENCY_FORMAT,
            align: 'right',
            textColor: '#A81D24',
            ...totalStyle,
        },
        null,
        null,
    ];

    return {
        data: [titleRow, metadataRow, filterRow, Array(EXCEL_COLUMNS_COUNT).fill(null), headers, ...rows, totalRow],
        columns: [
            { width: 12 },
            { width: 18 },
            { width: 15 },
            { width: 30 },
            { width: 15 },
            { width: 18 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
            { width: 24 },
            { width: 48 },
        ],
    };
};

export const exportPayablesToExcel = async ({ invoices, companyName, filters, generatedOn }) => {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const workbook = buildPayablesExcel({ invoices, companyName, filters, generatedOn });
    const fileName = `facturas_credito_${sanitizeFilePart(companyName)}_${generatedOn}.xlsx`;

    await writeExcelFile(workbook.data, {
        sheet: 'Facturas credito',
        columns: workbook.columns,
        stickyRowsCount: 5,
        showGridLines: false,
        orientation: 'landscape',
        zoomScale: 0.9,
    }, {
        fontFamily: 'Aptos',
        fontSize: 10,
    }).toFile(fileName);

    return fileName;
};
