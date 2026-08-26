import { doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_BRANCH_ID, DEFAULT_BRANCH_NAME } from '../constants';
import { companyCollection } from './companyFirestore';
import { normalizeExpenseClassification } from './expenseCategories';
import { deleteExpenseAttachments, uploadExpenseAttachments } from './expenseAttachments';
import {
    CASH_PAYMENT_METHOD,
    CREDIT_PROVIDER_PAYMENT_METHOD,
    getPaymentMethodLabel,
    isCreditCardPayment,
    normalizePaymentMethod,
    setCreditCardChargeInBatch,
} from './creditCardLiabilities';

const cleanText = (value) => String(value || '').trim();

export const isProviderCreditPayment = (value) => (
    normalizePaymentMethod(value) === CREDIT_PROVIDER_PAYMENT_METHOD
);

export const isExpensePayable = (item = {}) => (
    item.sourceCollection === 'gastos'
    || item.sourceType === 'Gasto'
    || item.accountingType === 'gasto'
    || item.isInventoryCost === false
    || Boolean(item.linkedExpenseId || item.sourceExpenseId)
);

export const createExpenseTransaction = async ({
    activeCompany,
    date,
    description,
    amount,
    category,
    subcategory,
    paymentMethod = CASH_PAYMENT_METHOD,
    supplier = '',
    invoiceNumber = '',
    dueDate = '',
    createdBy = '',
    captureSource = 'sistema',
    photoFiles = [],
    onUploadProgress,
}) => {
    const numericAmount = Number(amount);
    const cleanDescription = cleanText(description);
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod, CASH_PAYMENT_METHOD);
    const isProviderCredit = isProviderCreditPayment(normalizedPaymentMethod);
    const cleanSupplier = cleanText(supplier);

    if (!date || !cleanDescription || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Complete fecha, descripcion y un monto mayor que cero.');
    }
    if (isProviderCredit && !cleanSupplier) {
        throw new Error('Seleccione o escriba el proveedor del gasto a credito.');
    }

    const classification = normalizeExpenseClassification({
        category,
        subcategory,
        description: cleanDescription,
    });
    const companyBranch = {
        branch: activeCompany?.branchId || DEFAULT_BRANCH_ID,
        branchName: activeCompany?.branchName || DEFAULT_BRANCH_NAME,
    };
    const timestamp = Timestamp.now();
    const expenseRef = doc(companyCollection(db, activeCompany, 'gastos'));
    const payableRef = isProviderCredit
        ? doc(companyCollection(db, activeCompany, 'cuentas_por_pagar'))
        : null;
    const batch = writeBatch(db);
    let attachments = [];

    try {
        attachments = await uploadExpenseAttachments({
            activeCompany,
            expenseId: expenseRef.id,
            files: photoFiles,
            onProgress: onUploadProgress,
        });
    } catch (error) {
        throw new Error(error?.message || 'No se pudieron subir las fotos del gasto.');
    }

    const creditCardMovement = isCreditCardPayment(normalizedPaymentMethod)
        ? setCreditCardChargeInBatch(batch, {
            activeCompany,
            sourceCollection: 'gastos',
            sourceId: expenseRef.id,
            sourceType: 'Gasto',
            date,
            description: cleanDescription,
            amount: numericAmount,
            category: classification.category,
            subcategory: classification.subcategory,
            paymentMethod: normalizedPaymentMethod,
        })
        : null;

    batch.set(expenseRef, {
        date,
        month: date.substring(0, 7),
        description: cleanDescription,
        amount: numericAmount,
        category: classification.category,
        subcategory: classification.subcategory,
        categoryKey: `${classification.category} / ${classification.subcategory}`,
        branch: companyBranch.branch,
        branchName: companyBranch.branchName,
        paymentMethod: normalizedPaymentMethod,
        paymentMethodLabel: getPaymentMethodLabel(normalizedPaymentMethod),
        paymentType: isProviderCredit ? 'credito' : 'contado',
        supplier: isProviderCredit ? cleanSupplier : '',
        invoiceNumber: isProviderCredit ? cleanText(invoiceNumber) || 'S/N' : '',
        dueDate: isProviderCredit ? cleanText(dueDate) : '',
        linkedPayableId: payableRef?.id || null,
        linkedCreditCardMovementId: creditCardMovement?.id || null,
        accountingType: 'gasto',
        isInventoryCost: false,
        createdBy: cleanText(createdBy) || null,
        captureSource,
        attachments,
        attachmentCount: attachments.length,
        timestamp,
        is_conciled: false,
    });

    if (payableRef) {
        batch.set(payableRef, {
            fecha: date,
            month: date.substring(0, 7),
            proveedor: cleanSupplier,
            sucursal: companyBranch.branchName,
            branch: companyBranch.branch,
            branchName: companyBranch.branchName,
            numero: cleanText(invoiceNumber) || 'S/N',
            vencimiento: cleanText(dueDate),
            monto: numericAmount,
            saldo: numericAmount,
            estado: 'pendiente',
            paymentType: 'credito',
            paymentMethod: CREDIT_PROVIDER_PAYMENT_METHOD,
            isInventoryCost: false,
            accountingType: 'gasto',
            sourceCollection: 'gastos',
            sourceType: 'Gasto',
            sourceExpenseId: expenseRef.id,
            linkedExpenseId: expenseRef.id,
            mirroredToCompras: false,
            expenseDescription: cleanDescription,
            category: classification.category,
            subcategory: classification.subcategory,
            createdBy: cleanText(createdBy) || null,
            captureSource,
            attachments,
            attachmentCount: attachments.length,
            timestamp,
        });
    }

    try {
        await batch.commit();
    } catch (error) {
        await deleteExpenseAttachments(attachments);
        throw error;
    }

    return {
        expenseId: expenseRef.id,
        payableId: payableRef?.id || null,
        classification,
    };
};
