import React, { useEffect, useMemo } from 'react';
import {
    MAX_EXPENSE_PHOTOS,
    normalizeExpenseAttachments,
    validateExpensePhotoFiles,
} from '../services/expenseAttachments';

const UploadIcon = ({ className = 'h-4 w-4' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export default function ReceiptPhotoPicker({
    files = [],
    onChange,
    existing = [],
    compact = false,
    disabled = false,
    label = 'Tomar o seleccionar fotos',
}) {
    const normalizedExisting = useMemo(
        () => normalizeExpenseAttachments({ attachments: existing }),
        [existing]
    );
    const previews = useMemo(() => files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
    })), [files]);

    useEffect(() => () => {
        previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [previews]);

    const handleSelection = (event) => {
        try {
            const selected = validateExpensePhotoFiles(
                [...files, ...Array.from(event.target.files || [])],
                normalizedExisting.length
            );
            onChange(selected);
        } catch (error) {
            alert(error.message);
        } finally {
            event.target.value = '';
        }
    };

    const reachedLimit = normalizedExisting.length + files.length >= MAX_EXPENSE_PHOTOS;

    return (
        <div className={`space-y-2 ${compact ? 'min-w-[180px]' : ''}`}>
            {normalizedExisting.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {normalizedExisting.map((attachment, index) => (
                        <a
                            key={attachment.id || attachment.path || attachment.url || index}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative block h-14 w-14 overflow-hidden rounded border border-slate-200 bg-slate-50"
                            title={`Abrir comprobante ${index + 1}`}
                        >
                            <img
                                src={attachment.url}
                                alt={`Comprobante ${index + 1}`}
                                className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                        </a>
                    ))}
                </div>
            )}

            {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {previews.map((preview, index) => (
                        <div
                            key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                            className="relative h-14 w-14 overflow-hidden rounded border border-sky-300 bg-sky-50"
                        >
                            <img src={preview.url} alt={`Nueva foto ${index + 1}`} className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-red-600 text-xs font-bold text-white"
                                aria-label={`Quitar foto ${index + 1}`}
                                disabled={disabled}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <label className={`flex items-center justify-center gap-2 rounded border border-dashed border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 ${disabled || reachedLimit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-sky-100'}`}>
                <UploadIcon />
                {compact ? 'Agregar fotos' : label}
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleSelection}
                    disabled={disabled || reachedLimit}
                />
            </label>
            <div className="text-[10px] text-slate-400">
                Máximo {MAX_EXPENSE_PHOTOS} fotos. Se optimizan antes de guardar.
            </div>
        </div>
    );
}
