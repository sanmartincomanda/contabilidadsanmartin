import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytesResumable,
} from 'firebase/storage';
import { storage } from '../firebase';

export const MAX_EXPENSE_PHOTOS = 4;
export const MAX_EXPENSE_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;
const JPEG_QUALITY = 0.84;

const safePart = (value, fallback = 'archivo') => (
    String(value || fallback)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 90) || fallback
);

const makeId = () => (
    globalThis.crypto?.randomUUID?.()
    || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
);

export const normalizeExpenseAttachments = (item = {}) => {
    if (Array.isArray(item.attachments)) return item.attachments.filter((attachment) => attachment?.url);

    const legacyUrl = item.attachmentUrl || item.photoUrl || item.imageUrl || item.comprobanteUrl;
    if (!legacyUrl) return [];
    return [{
        id: 'legacy',
        name: 'Comprobante',
        url: legacyUrl,
        path: item.attachmentPath || item.photoPath || '',
        contentType: 'image/jpeg',
    }];
};

export const validateExpensePhotoFiles = (files = [], existingCount = 0) => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length + existingCount > MAX_EXPENSE_PHOTOS) {
        throw new Error(`Puede adjuntar un máximo de ${MAX_EXPENSE_PHOTOS} fotos por registro.`);
    }

    selectedFiles.forEach((file) => {
        if (!String(file.type || '').startsWith('image/')) {
            throw new Error(`${file.name || 'El archivo'} no es una imagen valida.`);
        }
        if (Number(file.size || 0) > MAX_EXPENSE_PHOTO_BYTES) {
            throw new Error(`${file.name || 'La imagen'} supera el limite de 15 MB.`);
        }
    });

    return selectedFiles;
};

const loadBrowserImage = (file) => new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`No se pudo procesar ${file.name || 'la imagen'}.`));
    };
    image.src = objectUrl;
});

const compressExpensePhoto = async (file) => {
    try {
        const { image, objectUrl } = await loadBrowserImage(file);
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
        if (!blob) return file;

        const originalBaseName = safePart(file.name || 'comprobante').replace(/\.[^.]+$/, '');
        return new File([blob], `${originalBaseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch (error) {
        console.warn('Se usara la foto original:', error);
        return file;
    }
};

const uploadSinglePhoto = ({ storageRef, file, metadata, onProgress }) => new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);
    task.on(
        'state_changed',
        (snapshot) => onProgress?.(snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0),
        reject,
        () => resolve(task.snapshot)
    );
});

export const uploadExpenseAttachments = async ({
    activeCompany,
    expenseId,
    recordType = 'gasto',
    files = [],
    existingCount = 0,
    onProgress,
}) => {
    const selectedFiles = validateExpensePhotoFiles(files, existingCount);
    if (!selectedFiles.length) return [];

    const companyId = safePart(activeCompany?.id || 'empresa');
    const receiptOwnerId = safePart(`${recordType}_${expenseId}`);
    const uploaded = [];

    try {
        for (let index = 0; index < selectedFiles.length; index += 1) {
            const originalFile = selectedFiles[index];
            const preparedFile = await compressExpensePhoto(originalFile);
            const photoId = makeId();
            const storagePath = `expense-receipts/${companyId}/${receiptOwnerId}/${photoId}_${safePart(preparedFile.name)}`;
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadSinglePhoto({
                storageRef,
                file: preparedFile,
                metadata: {
                    contentType: preparedFile.type || 'image/jpeg',
                    customMetadata: {
                        companyId: activeCompany?.id || '',
                        recordId: String(expenseId || ''),
                        recordType: String(recordType || 'gasto'),
                        originalName: originalFile.name || 'comprobante',
                    },
                },
                onProgress: (fileProgress) => onProgress?.((index + fileProgress) / selectedFiles.length),
            });
            const url = await getDownloadURL(snapshot.ref);

            uploaded.push({
                id: photoId,
                name: originalFile.name || preparedFile.name || 'Comprobante',
                url,
                path: storagePath,
                contentType: preparedFile.type || 'image/jpeg',
                size: Number(preparedFile.size || 0),
                uploadedAt: new Date().toISOString(),
            });
            onProgress?.((index + 1) / selectedFiles.length);
        }
    } catch (error) {
        await deleteExpenseAttachments(uploaded);
        throw error;
    }

    return uploaded;
};

export const deleteExpenseAttachments = async (attachments = []) => {
    const paths = normalizeExpenseAttachments({ attachments })
        .map((attachment) => attachment.path)
        .filter(Boolean);

    await Promise.allSettled(paths.map((path) => deleteObject(ref(storage, path))));
};
