import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    deleteCreditCardMovementInBatch,
    getCreditCardMovementId,
    isCreditCardPayment,
    normalizePaymentMethod,
    syncCreditCardMovementInBatch,
} from './creditCardLiabilities';

const uniqueRefs = (refs) => {
    const refMap = new Map();
    refs.filter(Boolean).forEach((ref) => refMap.set(ref.path, ref));
    return Array.from(refMap.values());
};

const addExistingRef = async (refs, collectionName, id) => {
    if (!id) return;
    const recordRef = doc(db, collectionName, id);
    const recordSnap = await getDoc(recordRef);
    if (recordSnap.exists()) {
        refs.push(recordRef);
    }
};

const getBlockingAbonos = async (facturaIds) => {
    if (!facturaIds.length) return [];

    const facturaIdSet = new Set(facturaIds);
    const abonosSnap = await getDocs(collection(db, 'abonos_pagar'));

    return abonosSnap.docs
        .map((abonoDoc) => ({ id: abonoDoc.id, ...abonoDoc.data() }))
        .filter((abono) =>
            (abono.detalleAfectado || []).some((detalle) => facturaIdSet.has(detalle?.id))
        );
};

const findPurchaseRefsForPayable = async (payableId, mirroredPurchaseId) => {
    const purchaseRefs = [];

    await addExistingRef(purchaseRefs, 'compras', mirroredPurchaseId);

    const linkedQueries = [
        query(collection(db, 'compras'), where('linkedPayableId', '==', payableId)),
        query(collection(db, 'compras'), where('sourceFacturaId', '==', payableId)),
    ];

    for (const linkedQuery of linkedQueries) {
        const purchaseSnap = await getDocs(linkedQuery);
        purchaseSnap.docs.forEach((purchaseDoc) => purchaseRefs.push(purchaseDoc.ref));
    }

    return uniqueRefs(purchaseRefs);
};

const findPayableRefsForPurchase = async (purchaseId, purchaseData) => {
    const payableRefs = [];

    await addExistingRef(payableRefs, 'cuentas_por_pagar', purchaseData?.linkedPayableId);
    await addExistingRef(payableRefs, 'cuentas_por_pagar', purchaseData?.sourceFacturaId);

    const linkedQueries = [
        query(collection(db, 'cuentas_por_pagar'), where('mirroredPurchaseId', '==', purchaseId)),
    ];

    for (const linkedQuery of linkedQueries) {
        const payableSnap = await getDocs(linkedQuery);
        payableSnap.docs.forEach((payableDoc) => payableRefs.push(payableDoc.ref));
    }

    return uniqueRefs(payableRefs);
};

const findGastoRefsForPurchase = async (purchaseId, purchaseData) => {
    const gastoRefs = [];

    await addExistingRef(gastoRefs, 'gastosDiarios', purchaseData?.sourceGastoDiarioId);

    const gastosSnap = await getDocs(
        query(collection(db, 'gastosDiarios'), where('linkedPurchaseId', '==', purchaseId))
    );
    gastosSnap.docs.forEach((gastoDoc) => gastoRefs.push(gastoDoc.ref));

    return uniqueRefs(gastoRefs);
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getMonthFromDate = (dateValue, fallback = '') => {
    if (!dateValue || typeof dateValue !== 'string') return fallback;
    return dateValue.substring(0, 7);
};

const buildPayableMirrorUpdate = (purchaseData, payableData) => {
    const nextAmount = toNumber(purchaseData.amount, toNumber(payableData?.monto));
    const currentAmount = toNumber(payableData?.monto);
    const currentSaldo = toNumber(payableData?.saldo);
    const appliedAmount = Math.max(currentAmount - currentSaldo, 0);
    const nextSaldo = Math.max(nextAmount - appliedAmount, 0);

    let nextEstado = 'pendiente';
    if (nextSaldo <= 0) {
        nextEstado = 'pagado';
    } else if (appliedAmount > 0) {
        nextEstado = 'parcial';
    }

    return {
        fecha: purchaseData.date || payableData?.fecha || '',
        month: purchaseData.month || getMonthFromDate(purchaseData.date, payableData?.month || ''),
        proveedor: purchaseData.supplier || payableData?.proveedor || '',
        numero: purchaseData.invoiceNumber ?? payableData?.numero ?? '',
        monto: nextAmount,
        saldo: nextSaldo,
        estado: nextEstado,
        branch: purchaseData.branch || payableData?.branch || '',
        branchName: purchaseData.branchName || payableData?.branchName || '',
        sucursal: purchaseData.branchName || payableData?.sucursal || payableData?.branchName || '',
    };
};

const buildGastoMirrorUpdate = (purchaseData, gastoData) => ({
    fecha: purchaseData.date || gastoData?.fecha || '',
    monto: toNumber(purchaseData.amount, toNumber(gastoData?.monto)),
    branch: purchaseData.branch || gastoData?.branch || '',
    branchName: purchaseData.branchName || gastoData?.branchName || '',
    sucursal: purchaseData.branch || gastoData?.sucursal || '',
    paymentMethod: purchaseData.paymentMethod || gastoData?.paymentMethod || 'efectivo',
    linkedCreditCardMovementId: purchaseData.linkedCreditCardMovementId || gastoData?.linkedCreditCardMovementId || null,
});

export async function deletePayableTransaction(payableId) {
    const payableRef = doc(db, 'cuentas_por_pagar', payableId);
    const payableSnap = await getDoc(payableRef);

    if (!payableSnap.exists()) {
        return { deleted: false, missing: true };
    }

    const payableData = payableSnap.data();
    const blockingAbonos = await getBlockingAbonos([payableId]);

    if (blockingAbonos.length) {
        return {
            deleted: false,
            blocked: true,
            blockingAbonos,
        };
    }

    const purchaseRefs = await findPurchaseRefsForPayable(
        payableId,
        payableData?.mirroredPurchaseId
    );

    const batch = writeBatch(db);
    batch.delete(payableRef);
    purchaseRefs.forEach((purchaseRef) => {
        batch.delete(purchaseRef);
        deleteCreditCardMovementInBatch(batch, 'compras', purchaseRef.id);
    });
    await batch.commit();

    return {
        deleted: true,
        linkedPurchaseIds: purchaseRefs.map((purchaseRef) => purchaseRef.id),
    };
}

export async function deletePurchaseTransaction(purchaseId) {
    const purchaseRef = doc(db, 'compras', purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);

    if (!purchaseSnap.exists()) {
        return { deleted: false, missing: true };
    }

    const purchaseData = purchaseSnap.data();
    const payableRefs = await findPayableRefsForPurchase(purchaseId, purchaseData);
    const blockingAbonos = await getBlockingAbonos(payableRefs.map((payableRef) => payableRef.id));

    if (blockingAbonos.length) {
        return {
            deleted: false,
            blocked: true,
            blockingAbonos,
        };
    }

    const gastoRefs = await findGastoRefsForPurchase(purchaseId, purchaseData);

    const batch = writeBatch(db);
    batch.delete(purchaseRef);
    deleteCreditCardMovementInBatch(batch, 'compras', purchaseId);
    payableRefs.forEach((payableRef) => batch.delete(payableRef));
    gastoRefs.forEach((gastoRef) => {
        batch.delete(gastoRef);
        deleteCreditCardMovementInBatch(batch, 'gastosDiarios', gastoRef.id);
    });
    await batch.commit();

    return {
        deleted: true,
        linkedPayableIds: payableRefs.map((payableRef) => payableRef.id),
        linkedGastoDiarioIds: gastoRefs.map((gastoRef) => gastoRef.id),
    };
}

export async function updatePurchaseTransaction(purchaseId, purchaseUpdates) {
    const purchaseRef = doc(db, 'compras', purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);

    if (!purchaseSnap.exists()) {
        return { updated: false, missing: true };
    }

    const currentPurchase = purchaseSnap.data();
    const nextPurchase = {
        ...currentPurchase,
        ...purchaseUpdates,
    };

    if (nextPurchase.date) {
        nextPurchase.month = getMonthFromDate(nextPurchase.date, nextPurchase.month || '');
    }

    nextPurchase.paymentMethod = normalizePaymentMethod(
        nextPurchase.paymentMethod,
        nextPurchase.paymentType === 'credito' ? 'credito' : 'efectivo'
    );

    const movementSourceCollection = nextPurchase.sourceGastoDiarioId ? 'gastosDiarios' : 'compras';
    const movementSourceId = nextPurchase.sourceGastoDiarioId || purchaseId;
    nextPurchase.linkedCreditCardMovementId = isCreditCardPayment(nextPurchase.paymentMethod)
        ? getCreditCardMovementId(movementSourceCollection, movementSourceId)
        : null;

    const payableRefs = await findPayableRefsForPurchase(purchaseId, nextPurchase);
    const gastoRefs = await findGastoRefsForPurchase(purchaseId, nextPurchase);

    const batch = writeBatch(db);
    batch.update(purchaseRef, nextPurchase);
    syncCreditCardMovementInBatch(batch, {
        sourceCollection: movementSourceCollection,
        sourceId: movementSourceId,
        sourceType: 'Compra',
        date: nextPurchase.date,
        description: nextPurchase.description || nextPurchase.supplier || 'COMPRA',
        amount: nextPurchase.amount,
        category: nextPurchase.category,
        subcategory: nextPurchase.subcategory,
        provider: nextPurchase.supplier,
        invoiceNumber: nextPurchase.invoiceNumber,
        paymentMethod: nextPurchase.paymentMethod,
    });
    if (movementSourceCollection !== 'compras') {
        deleteCreditCardMovementInBatch(batch, 'compras', purchaseId);
    }

    for (const payableRef of payableRefs) {
        const payableSnap = await getDoc(payableRef);
        if (!payableSnap.exists()) continue;
        batch.update(payableRef, buildPayableMirrorUpdate(nextPurchase, payableSnap.data()));
    }

    for (const gastoRef of gastoRefs) {
        const gastoSnap = await getDoc(gastoRef);
        if (!gastoSnap.exists()) continue;
        batch.update(gastoRef, buildGastoMirrorUpdate(nextPurchase, gastoSnap.data()));
    }

    await batch.commit();

    return {
        updated: true,
        purchase: nextPurchase,
        linkedPayableIds: payableRefs.map((payableRef) => payableRef.id),
        linkedGastoDiarioIds: gastoRefs.map((gastoRef) => gastoRef.id),
    };
}
