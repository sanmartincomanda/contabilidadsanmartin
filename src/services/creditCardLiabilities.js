import { collection, deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const CREDIT_CARD_MOVEMENTS_COLLECTION = 'pasivos_tarjeta_movimientos';
export const CREDIT_CARD_ID = 'infinite_lafise';
export const CREDIT_CARD_NAME = 'Tarjeta Infinite Lafise';

export const CASH_PAYMENT_METHOD = 'efectivo';
export const TRANSFER_PAYMENT_METHOD = 'transferencia';
export const CREDIT_PROVIDER_PAYMENT_METHOD = 'credito';
export const CREDIT_CARD_PAYMENT_METHOD = 'tarjeta_infinite_lafise';

const PAYMENT_METHOD_ALIASES = {
    efectivo: CASH_PAYMENT_METHOD,
    cash: CASH_PAYMENT_METHOD,
    transferencia: TRANSFER_PAYMENT_METHOD,
    transfer: TRANSFER_PAYMENT_METHOD,
    banco: TRANSFER_PAYMENT_METHOD,
    credito: CREDIT_PROVIDER_PAYMENT_METHOD,
    credit: CREDIT_PROVIDER_PAYMENT_METHOD,
    'credito proveedor': CREDIT_PROVIDER_PAYMENT_METHOD,
    'crédito proveedor': CREDIT_PROVIDER_PAYMENT_METHOD,
    tarjeta: CREDIT_CARD_PAYMENT_METHOD,
    'tarjeta infinite lafise': CREDIT_CARD_PAYMENT_METHOD,
    tarjeta_infinite_lafise: CREDIT_CARD_PAYMENT_METHOD,
    infinite_lafise: CREDIT_CARD_PAYMENT_METHOD,
    'infinite lafise': CREDIT_CARD_PAYMENT_METHOD,
};

export const PAYMENT_METHOD_LABELS = {
    [CASH_PAYMENT_METHOD]: 'Efectivo',
    [TRANSFER_PAYMENT_METHOD]: 'Transferencia',
    [CREDIT_PROVIDER_PAYMENT_METHOD]: 'Credito proveedor',
    [CREDIT_CARD_PAYMENT_METHOD]: CREDIT_CARD_NAME,
};

export const ENTRY_PAYMENT_METHOD_OPTIONS = [
    { value: CASH_PAYMENT_METHOD, label: PAYMENT_METHOD_LABELS[CASH_PAYMENT_METHOD] },
    { value: CREDIT_CARD_PAYMENT_METHOD, label: CREDIT_CARD_NAME },
];

export const HISTORY_PAYMENT_METHOD_OPTIONS = [
    ...ENTRY_PAYMENT_METHOD_OPTIONS,
    { value: CREDIT_PROVIDER_PAYMENT_METHOD, label: PAYMENT_METHOD_LABELS[CREDIT_PROVIDER_PAYMENT_METHOD] },
];

export const PAYABLE_PAYMENT_METHOD_OPTIONS = [
    { value: TRANSFER_PAYMENT_METHOD, label: PAYMENT_METHOD_LABELS[TRANSFER_PAYMENT_METHOD] },
    { value: CASH_PAYMENT_METHOD, label: PAYMENT_METHOD_LABELS[CASH_PAYMENT_METHOD] },
    { value: CREDIT_CARD_PAYMENT_METHOD, label: CREDIT_CARD_NAME },
];

const sanitizeSourcePart = (value) => String(value || 'sin_origen').replace(/[^a-zA-Z0-9_-]/g, '_');

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const cleanText = (value) => String(value || '').trim();

export const normalizePaymentMethod = (value, fallback = CASH_PAYMENT_METHOD) => {
    const normalized = cleanText(value).toLowerCase();
    if (!normalized) return fallback;
    return PAYMENT_METHOD_ALIASES[normalized] || normalized;
};

export const getPaymentMethodLabel = (value) => {
    const normalized = normalizePaymentMethod(value);
    return PAYMENT_METHOD_LABELS[normalized] || cleanText(value) || 'Sin metodo';
};

export const isCreditCardPayment = (value) => (
    normalizePaymentMethod(value) === CREDIT_CARD_PAYMENT_METHOD
);

export const getCreditCardMovementId = (sourceCollection, sourceId) => (
    `${sanitizeSourcePart(sourceCollection)}__${sanitizeSourcePart(sourceId)}`
);

export const getCreditCardMovementRef = (sourceCollection, sourceId) => (
    doc(db, CREDIT_CARD_MOVEMENTS_COLLECTION, getCreditCardMovementId(sourceCollection, sourceId))
);

export const buildCreditCardCharge = ({
    sourceCollection,
    sourceId,
    sourceType = 'cargo',
    date,
    description,
    amount,
    category,
    subcategory,
    provider,
    supplier,
    invoiceNumber,
    paymentMethod = CREDIT_CARD_PAYMENT_METHOD,
}) => {
    const now = Timestamp.now();
    const dateValue = date || '';

    return {
        cardId: CREDIT_CARD_ID,
        cardName: CREDIT_CARD_NAME,
        type: 'cargo',
        status: 'activo',
        date: dateValue,
        month: dateValue ? dateValue.substring(0, 7) : '',
        description: cleanText(description).toUpperCase(),
        amount: toNumber(amount),
        sourceCollection,
        sourceId,
        sourceType,
        category: category || null,
        subcategory: subcategory || null,
        provider: provider || supplier || null,
        invoiceNumber: invoiceNumber || null,
        paymentMethod: normalizePaymentMethod(paymentMethod),
        timestamp: now,
        updatedAt: now,
    };
};

export const buildCreditCardPayment = ({
    date,
    description,
    amount,
    paymentMethod = TRANSFER_PAYMENT_METHOD,
}) => {
    const now = Timestamp.now();
    const dateValue = date || '';

    return {
        cardId: CREDIT_CARD_ID,
        cardName: CREDIT_CARD_NAME,
        type: 'abono',
        status: 'activo',
        date: dateValue,
        month: dateValue ? dateValue.substring(0, 7) : '',
        description: cleanText(description || `ABONO ${CREDIT_CARD_NAME}`).toUpperCase(),
        amount: toNumber(amount),
        sourceCollection: 'pasivos',
        sourceType: 'abono_tarjeta',
        paymentMethod: normalizePaymentMethod(paymentMethod, TRANSFER_PAYMENT_METHOD),
        timestamp: now,
        updatedAt: now,
    };
};

export const setCreditCardChargeInBatch = (batch, payload) => {
    const movementRef = getCreditCardMovementRef(payload.sourceCollection, payload.sourceId);
    batch.set(movementRef, buildCreditCardCharge(payload), { merge: true });
    return { id: movementRef.id, ref: movementRef };
};

export const deleteCreditCardMovementInBatch = (batch, sourceCollection, sourceId) => {
    batch.delete(getCreditCardMovementRef(sourceCollection, sourceId));
};

export const syncCreditCardMovementInBatch = (batch, payload) => {
    if (isCreditCardPayment(payload.paymentMethod)) {
        return setCreditCardChargeInBatch(batch, payload).id;
    }
    deleteCreditCardMovementInBatch(batch, payload.sourceCollection, payload.sourceId);
    return null;
};

export const syncCreditCardMovementForSource = async (payload) => {
    const movementRef = getCreditCardMovementRef(payload.sourceCollection, payload.sourceId);
    if (isCreditCardPayment(payload.paymentMethod)) {
        await setDoc(movementRef, buildCreditCardCharge(payload), { merge: true });
        return movementRef.id;
    }
    await deleteDoc(movementRef);
    return null;
};

export const deleteCreditCardMovementForSource = async (sourceCollection, sourceId) => {
    await deleteDoc(getCreditCardMovementRef(sourceCollection, sourceId));
};

export const addCreditCardPayment = async (payload) => {
    const paymentRef = doc(collection(db, CREDIT_CARD_MOVEMENTS_COLLECTION));
    await setDoc(paymentRef, {
        ...buildCreditCardPayment(payload),
        sourceId: paymentRef.id,
    });
    return paymentRef.id;
};
