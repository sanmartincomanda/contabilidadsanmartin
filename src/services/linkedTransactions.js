import {
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { companyCollection, companyDoc } from './companyFirestore';
import {
    deleteExpenseAttachments,
    normalizeExpenseAttachments,
    uploadExpenseAttachments,
} from './expenseAttachments';
import {
    deleteCreditCardMovementInBatch,
    CREDIT_PROVIDER_PAYMENT_METHOD,
    getPaymentMethodLabel,
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

const addExistingRef = async (refs, collectionName, id, activeCompany) => {
    if (!id) return;
    const recordRef = companyDoc(db, activeCompany, collectionName, id);
    const recordSnap = await getDoc(recordRef);
    if (recordSnap.exists()) {
        refs.push(recordRef);
    }
};

const getBlockingAbonos = async (facturaIds, activeCompany) => {
    if (!facturaIds.length) return [];

    const facturaIdSet = new Set(facturaIds);
    const abonosSnap = await getDocs(companyCollection(db, activeCompany, 'abonos_pagar'));

    return abonosSnap.docs
        .map((abonoDoc) => ({ id: abonoDoc.id, ...abonoDoc.data() }))
        .filter((abono) =>
            (abono.detalleAfectado || []).some((detalle) => facturaIdSet.has(detalle?.id))
        );
};

const findPurchaseRefsForPayable = async (payableId, mirroredPurchaseId, activeCompany) => {
    const purchaseRefs = [];

    await addExistingRef(purchaseRefs, 'compras', mirroredPurchaseId, activeCompany);

    const linkedQueries = [
        query(companyCollection(db, activeCompany, 'compras'), where('linkedPayableId', '==', payableId)),
        query(companyCollection(db, activeCompany, 'compras'), where('sourceFacturaId', '==', payableId)),
    ];

    for (const linkedQuery of linkedQueries) {
        const purchaseSnap = await getDocs(linkedQuery);
        purchaseSnap.docs.forEach((purchaseDoc) => purchaseRefs.push(purchaseDoc.ref));
    }

    return uniqueRefs(purchaseRefs);
};

const findExpenseRefsForPayable = async (payableId, payableData, activeCompany) => {
    const expenseRefs = [];

    await addExistingRef(expenseRefs, 'gastos', payableData?.linkedExpenseId, activeCompany);
    await addExistingRef(expenseRefs, 'gastos', payableData?.sourceExpenseId, activeCompany);

    const expenseSnap = await getDocs(
        query(companyCollection(db, activeCompany, 'gastos'), where('linkedPayableId', '==', payableId))
    );
    expenseSnap.docs.forEach((expenseDoc) => expenseRefs.push(expenseDoc.ref));

    return uniqueRefs(expenseRefs);
};

const findPayableRefsForPurchase = async (purchaseId, purchaseData, activeCompany) => {
    const payableRefs = [];

    await addExistingRef(payableRefs, 'cuentas_por_pagar', purchaseData?.linkedPayableId, activeCompany);
    await addExistingRef(payableRefs, 'cuentas_por_pagar', purchaseData?.sourceFacturaId, activeCompany);

    const linkedQueries = [
        query(companyCollection(db, activeCompany, 'cuentas_por_pagar'), where('mirroredPurchaseId', '==', purchaseId)),
    ];

    for (const linkedQuery of linkedQueries) {
        const payableSnap = await getDocs(linkedQuery);
        payableSnap.docs.forEach((payableDoc) => payableRefs.push(payableDoc.ref));
    }

    return uniqueRefs(payableRefs);
};

const findPayableRefsForExpense = async (expenseId, expenseData, activeCompany) => {
    const payableRefs = [];

    await addExistingRef(payableRefs, 'cuentas_por_pagar', expenseData?.linkedPayableId, activeCompany);

    const linkedQueries = [
        query(companyCollection(db, activeCompany, 'cuentas_por_pagar'), where('linkedExpenseId', '==', expenseId)),
        query(companyCollection(db, activeCompany, 'cuentas_por_pagar'), where('sourceExpenseId', '==', expenseId)),
    ];

    for (const linkedQuery of linkedQueries) {
        const payableSnap = await getDocs(linkedQuery);
        payableSnap.docs.forEach((payableDoc) => payableRefs.push(payableDoc.ref));
    }

    return uniqueRefs(payableRefs);
};

const findGastoRefsForPurchase = async (purchaseId, purchaseData, activeCompany) => {
    const gastoRefs = [];

    await addExistingRef(gastoRefs, 'gastosDiarios', purchaseData?.sourceGastoDiarioId, activeCompany);

    const gastosSnap = await getDocs(
        query(companyCollection(db, activeCompany, 'gastosDiarios'), where('linkedPurchaseId', '==', purchaseId))
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

    const attachments = normalizeExpenseAttachments(purchaseData);

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
        attachments,
        attachmentCount: attachments.length,
    };
};

const buildGastoMirrorUpdate = (purchaseData, gastoData) => {
    const attachments = normalizeExpenseAttachments(purchaseData);
    return {
        fecha: purchaseData.date || gastoData?.fecha || '',
        monto: toNumber(purchaseData.amount, toNumber(gastoData?.monto)),
        branch: purchaseData.branch || gastoData?.branch || '',
        branchName: purchaseData.branchName || gastoData?.branchName || '',
        sucursal: purchaseData.branch || gastoData?.sucursal || '',
        paymentMethod: purchaseData.paymentMethod || gastoData?.paymentMethod || 'efectivo',
        linkedCreditCardMovementId: purchaseData.linkedCreditCardMovementId || gastoData?.linkedCreditCardMovementId || null,
        attachments,
        attachmentCount: attachments.length,
    };
};

const buildExpensePayableUpdate = (expenseData, payableData) => {
    const nextAmount = toNumber(expenseData.amount, toNumber(payableData?.monto));
    const currentAmount = toNumber(payableData?.monto);
    const currentSaldo = toNumber(payableData?.saldo);
    const appliedAmount = Math.max(currentAmount - currentSaldo, 0);
    const nextSaldo = Math.max(nextAmount - appliedAmount, 0);

    let nextEstado = 'pendiente';
    if (nextSaldo <= 0) nextEstado = 'pagado';
    else if (appliedAmount > 0) nextEstado = 'parcial';

    return {
        fecha: expenseData.date || payableData?.fecha || '',
        month: expenseData.month || getMonthFromDate(expenseData.date, payableData?.month || ''),
        proveedor: expenseData.supplier || payableData?.proveedor || '',
        numero: expenseData.invoiceNumber || payableData?.numero || 'S/N',
        vencimiento: expenseData.dueDate ?? payableData?.vencimiento ?? '',
        monto: nextAmount,
        saldo: nextSaldo,
        estado: nextEstado,
        branch: expenseData.branch || payableData?.branch || '',
        branchName: expenseData.branchName || payableData?.branchName || '',
        sucursal: expenseData.branchName || payableData?.sucursal || payableData?.branchName || '',
        paymentType: 'credito',
        paymentMethod: CREDIT_PROVIDER_PAYMENT_METHOD,
        isInventoryCost: false,
        accountingType: 'gasto',
        sourceCollection: 'gastos',
        sourceType: 'Gasto',
        expenseDescription: expenseData.description || payableData?.expenseDescription || '',
        category: expenseData.category || payableData?.category || null,
        subcategory: expenseData.subcategory || payableData?.subcategory || null,
        attachments: normalizeExpenseAttachments(expenseData),
        attachmentCount: normalizeExpenseAttachments(expenseData).length,
        mirroredToCompras: false,
        updatedAt: Timestamp.now(),
    };
};

export async function deletePayableTransaction(payableId, activeCompany) {
    const payableRef = companyDoc(db, activeCompany, 'cuentas_por_pagar', payableId);
    const payableSnap = await getDoc(payableRef);

    if (!payableSnap.exists()) {
        return { deleted: false, missing: true };
    }

    const payableData = payableSnap.data();
    const blockingAbonos = await getBlockingAbonos([payableId], activeCompany);

    if (blockingAbonos.length) {
        return {
            deleted: false,
            blocked: true,
            blockingAbonos,
        };
    }

    const purchaseRefs = await findPurchaseRefsForPayable(
        payableId,
        payableData?.mirroredPurchaseId,
        activeCompany
    );
    const expenseRefs = await findExpenseRefsForPayable(payableId, payableData, activeCompany);

    const batch = writeBatch(db);
    batch.delete(payableRef);
    purchaseRefs.forEach((purchaseRef) => {
        batch.delete(purchaseRef);
        deleteCreditCardMovementInBatch(batch, 'compras', purchaseRef.id, activeCompany);
    });
    expenseRefs.forEach((expenseRef) => {
        batch.delete(expenseRef);
        deleteCreditCardMovementInBatch(batch, 'gastos', expenseRef.id, activeCompany);
    });
    await batch.commit();
    await deleteExpenseAttachments(normalizeExpenseAttachments(payableData));

    return {
        deleted: true,
        linkedPurchaseIds: purchaseRefs.map((purchaseRef) => purchaseRef.id),
        linkedExpenseIds: expenseRefs.map((expenseRef) => expenseRef.id),
    };
}

export async function deleteExpenseTransaction(expenseId, activeCompany) {
    const expenseRef = companyDoc(db, activeCompany, 'gastos', expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
        return { deleted: false, missing: true };
    }

    const expenseData = expenseSnap.data();
    const payableRefs = await findPayableRefsForExpense(expenseId, expenseData, activeCompany);
    const blockingAbonos = await getBlockingAbonos(payableRefs.map((payableRef) => payableRef.id), activeCompany);

    if (blockingAbonos.length) {
        return { deleted: false, blocked: true, blockingAbonos };
    }

    const batch = writeBatch(db);
    batch.delete(expenseRef);
    deleteCreditCardMovementInBatch(batch, 'gastos', expenseId, activeCompany);
    payableRefs.forEach((payableRef) => batch.delete(payableRef));
    await batch.commit();
    await deleteExpenseAttachments(normalizeExpenseAttachments(expenseData));

    return {
        deleted: true,
        linkedPayableIds: payableRefs.map((payableRef) => payableRef.id),
    };
}

export async function deletePurchaseTransaction(purchaseId, activeCompany) {
    const purchaseRef = companyDoc(db, activeCompany, 'compras', purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);

    if (!purchaseSnap.exists()) {
        return { deleted: false, missing: true };
    }

    const purchaseData = purchaseSnap.data();
    const payableRefs = await findPayableRefsForPurchase(purchaseId, purchaseData, activeCompany);
    const blockingAbonos = await getBlockingAbonos(payableRefs.map((payableRef) => payableRef.id), activeCompany);

    if (blockingAbonos.length) {
        return {
            deleted: false,
            blocked: true,
            blockingAbonos,
        };
    }

    const gastoRefs = await findGastoRefsForPurchase(purchaseId, purchaseData, activeCompany);

    const batch = writeBatch(db);
    batch.delete(purchaseRef);
    deleteCreditCardMovementInBatch(batch, 'compras', purchaseId, activeCompany);
    payableRefs.forEach((payableRef) => batch.delete(payableRef));
    gastoRefs.forEach((gastoRef) => {
        batch.delete(gastoRef);
        deleteCreditCardMovementInBatch(batch, 'gastosDiarios', gastoRef.id, activeCompany);
    });
    await batch.commit();
    await deleteExpenseAttachments(normalizeExpenseAttachments(purchaseData));

    return {
        deleted: true,
        linkedPayableIds: payableRefs.map((payableRef) => payableRef.id),
        linkedGastoDiarioIds: gastoRefs.map((gastoRef) => gastoRef.id),
    };
}

export async function updatePurchaseTransaction(purchaseId, purchaseUpdates, activeCompany, attachmentChanges = {}) {
    const purchaseRef = companyDoc(db, activeCompany, 'compras', purchaseId);
    const purchaseSnap = await getDoc(purchaseRef);

    if (!purchaseSnap.exists()) {
        return { updated: false, missing: true };
    }

    const currentPurchase = purchaseSnap.data();
    const currentAttachments = normalizeExpenseAttachments(currentPurchase);
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

    const payableRefs = await findPayableRefsForPurchase(purchaseId, nextPurchase, activeCompany);
    const gastoRefs = await findGastoRefsForPurchase(purchaseId, nextPurchase, activeCompany);
    const payableEntries = await Promise.all(payableRefs.map(async (payableRef) => ({
        payableRef,
        payableSnap: await getDoc(payableRef),
    })));
    const gastoEntries = await Promise.all(gastoRefs.map(async (gastoRef) => ({
        gastoRef,
        gastoSnap: await getDoc(gastoRef),
    })));

    const newAttachments = await uploadExpenseAttachments({
        activeCompany,
        expenseId: purchaseId,
        recordType: 'compra',
        files: attachmentChanges.newFiles || [],
        existingCount: currentAttachments.length,
        onProgress: attachmentChanges.onUploadProgress,
    });
    nextPurchase.attachments = [...currentAttachments, ...newAttachments];
    nextPurchase.attachmentCount = nextPurchase.attachments.length;

    const batch = writeBatch(db);
    batch.update(purchaseRef, nextPurchase);
    syncCreditCardMovementInBatch(batch, {
        activeCompany,
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
        deleteCreditCardMovementInBatch(batch, 'compras', purchaseId, activeCompany);
    }

    for (const { payableRef, payableSnap } of payableEntries) {
        if (!payableSnap.exists()) continue;
        batch.update(payableRef, buildPayableMirrorUpdate(nextPurchase, payableSnap.data()));
    }

    for (const { gastoRef, gastoSnap } of gastoEntries) {
        if (!gastoSnap.exists()) continue;
        batch.update(gastoRef, buildGastoMirrorUpdate(nextPurchase, gastoSnap.data()));
    }

    try {
        await batch.commit();
    } catch (error) {
        await deleteExpenseAttachments(newAttachments);
        throw error;
    }

    return {
        updated: true,
        purchase: nextPurchase,
        linkedPayableIds: payableRefs.map((payableRef) => payableRef.id),
        linkedGastoDiarioIds: gastoRefs.map((gastoRef) => gastoRef.id),
    };
}

export async function updateExpenseTransaction(expenseId, expenseUpdates, activeCompany, attachmentChanges = {}) {
    const expenseRef = companyDoc(db, activeCompany, 'gastos', expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
        return { updated: false, missing: true };
    }

    const currentExpense = expenseSnap.data();
    const nextExpense = { ...currentExpense, ...expenseUpdates };
    const currentAttachments = normalizeExpenseAttachments(currentExpense);
    nextExpense.paymentMethod = normalizePaymentMethod(nextExpense.paymentMethod, 'efectivo');
    nextExpense.paymentMethodLabel = getPaymentMethodLabel(nextExpense.paymentMethod);
    nextExpense.paymentType = nextExpense.paymentMethod === CREDIT_PROVIDER_PAYMENT_METHOD ? 'credito' : 'contado';
    nextExpense.month = getMonthFromDate(nextExpense.date, nextExpense.month || '');
    nextExpense.accountingType = 'gasto';
    nextExpense.isInventoryCost = false;

    let payableRefs = await findPayableRefsForExpense(expenseId, nextExpense, activeCompany);
    const isProviderCredit = nextExpense.paymentMethod === CREDIT_PROVIDER_PAYMENT_METHOD;

    if (isProviderCredit && !String(nextExpense.supplier || '').trim()) {
        throw new Error('Ingrese el proveedor antes de guardar el gasto a credito.');
    }

    if (!isProviderCredit && payableRefs.length) {
        const blockingAbonos = await getBlockingAbonos(payableRefs.map((payableRef) => payableRef.id), activeCompany);
        if (blockingAbonos.length) {
            return { updated: false, blocked: true, blockingAbonos };
        }
    }

    if (isProviderCredit && payableRefs.length === 0) {
        payableRefs = [doc(companyCollection(db, activeCompany, 'cuentas_por_pagar'))];
    }

    nextExpense.linkedPayableId = isProviderCredit ? payableRefs[0]?.id || null : null;
    nextExpense.invoiceNumber = isProviderCredit ? String(nextExpense.invoiceNumber || '').trim() || 'S/N' : '';
    nextExpense.dueDate = isProviderCredit ? nextExpense.dueDate || '' : '';
    nextExpense.supplier = isProviderCredit ? String(nextExpense.supplier || '').trim() : '';
    nextExpense.linkedCreditCardMovementId = isCreditCardPayment(nextExpense.paymentMethod)
        ? getCreditCardMovementId('gastos', expenseId)
        : null;

    const payableEntries = [];
    if (isProviderCredit) {
        for (const payableRef of payableRefs) {
            const payableSnap = await getDoc(payableRef);
            payableEntries.push({ payableRef, payableSnap });
        }
    }

    const newAttachments = await uploadExpenseAttachments({
        activeCompany,
        expenseId,
        files: attachmentChanges.newFiles || [],
        existingCount: currentAttachments.length,
        onProgress: attachmentChanges.onUploadProgress,
    });
    nextExpense.attachments = [...currentAttachments, ...newAttachments];
    nextExpense.attachmentCount = nextExpense.attachments.length;

    const batch = writeBatch(db);
    batch.update(expenseRef, nextExpense);
    syncCreditCardMovementInBatch(batch, {
        activeCompany,
        sourceCollection: 'gastos',
        sourceId: expenseId,
        sourceType: 'Gasto',
        date: nextExpense.date,
        description: nextExpense.description,
        amount: nextExpense.amount,
        category: nextExpense.category,
        subcategory: nextExpense.subcategory,
        paymentMethod: nextExpense.paymentMethod,
    });

    if (isProviderCredit) {
        for (const { payableRef, payableSnap } of payableEntries) {
            const payableData = payableSnap.exists() ? payableSnap.data() : {};
            const payableUpdate = {
                ...buildExpensePayableUpdate(nextExpense, payableData),
                sourceExpenseId: expenseId,
                linkedExpenseId: expenseId,
                timestamp: payableData.timestamp || Timestamp.now(),
            };
            if (payableSnap.exists()) batch.update(payableRef, payableUpdate);
            else batch.set(payableRef, payableUpdate);
        }
    } else {
        payableRefs.forEach((payableRef) => batch.delete(payableRef));
    }

    try {
        await batch.commit();
    } catch (error) {
        await deleteExpenseAttachments(newAttachments);
        throw error;
    }

    return {
        updated: true,
        expense: nextExpense,
        linkedPayableIds: isProviderCredit ? payableRefs.map((payableRef) => payableRef.id) : [],
    };
}
