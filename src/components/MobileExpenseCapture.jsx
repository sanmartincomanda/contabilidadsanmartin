import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import {
    EXPENSE_CATEGORY_OPTIONS,
    getDefaultSubcategory,
    getExpenseSubcategories,
} from '../services/expenseCategories';
import { createExpenseTransaction, isProviderCreditPayment } from '../services/expenseTransactions';
import {
    CASH_PAYMENT_METHOD,
    EXPENSE_PAYMENT_METHOD_OPTIONS,
    TRANSFER_PAYMENT_METHOD,
} from '../services/creditCardLiabilities';
import { getExpenseCaptureUser } from '../services/companies';
import { getLocalDateString } from '../utils/localDate';
import {
    MAX_EXPENSE_PHOTOS,
    validateExpensePhotoFiles,
} from '../services/expenseAttachments';

const Icon = ({ children, className = 'h-5 w-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {children}
    </svg>
);

const Field = ({ label, icon, children, hint }) => (
    <label className="mobile-expense-field">
        <span>{label}</span>
        <div className="mobile-expense-control">
            {icon}
            {children}
        </div>
        {hint && <small>{hint}</small>}
    </label>
);

export default function MobileExpenseCapture() {
    const { user, logout } = useAuth();
    const { activeCompany } = useCompany();
    const navigate = useNavigate();
    const captureUser = getExpenseCaptureUser(user?.email);
    const [date, setDate] = useState(getLocalDateString());
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(CASH_PAYMENT_METHOD);
    const [supplier, setSupplier] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [photoFiles, setPhotoFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const subcategories = useMemo(() => getExpenseSubcategories(category), [category]);
    const photoPreviews = useMemo(() => photoFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
    })), [photoFiles]);
    const isProviderCredit = isProviderCreditPayment(paymentMethod);

    useEffect(() => {
        document.title = `Captura de gastos | ${activeCompany.name}`;
    }, [activeCompany.name]);

    useEffect(() => () => {
        photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [photoPreviews]);

    const handlePhotoSelection = (event) => {
        try {
            setPhotoFiles(validateExpensePhotoFiles([
                ...photoFiles,
                ...Array.from(event.target.files || []),
            ]));
            setFeedback(null);
        } catch (error) {
            setFeedback({ type: 'error', message: error.message });
        } finally {
            event.target.value = '';
        }
    };

    const handleCategoryChange = (nextCategory) => {
        setCategory(nextCategory);
        setSubcategory(getDefaultSubcategory(nextCategory));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFeedback(null);
        setLoading(true);
        setUploadProgress(0);
        try {
            const result = await createExpenseTransaction({
                activeCompany,
                date,
                description,
                amount,
                category,
                subcategory,
                paymentMethod,
                supplier,
                invoiceNumber,
                dueDate,
                createdBy: user?.email,
                captureSource: 'formgasto',
                photoFiles,
                onUploadProgress: setUploadProgress,
            });

            setFeedback({
                type: 'success',
                message: result.payableId
                    ? 'Gasto registrado y enviado a Cuentas por Pagar.'
                    : 'Gasto registrado correctamente.',
            });
            setDescription('');
            setAmount('');
            setCategory('');
            setSubcategory('');
            setPaymentMethod(CASH_PAYMENT_METHOD);
            setSupplier('');
            setInvoiceNumber('');
            setDueDate('');
            setPhotoFiles([]);
            setUploadProgress(0);
        } catch (error) {
            console.error('Error registrando gasto movil:', error);
            setFeedback({ type: 'error', message: error?.message || 'No fue posible registrar el gasto.' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/captura-gastos', { replace: true });
    };

    return (
        <main className="mobile-expense-page">
            <section className="mobile-expense-app">
                <header className="mobile-expense-header">
                    <div className="mobile-expense-header-mark">
                        <Icon className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m4 7 4 4 4-5m-4 5v6m4-6h8m-4-4v10" /></Icon>
                    </div>
                    <div className="mobile-expense-header-title">
                        <div>Captura activa</div>
                        <strong>Ingreso de gastos</strong>
                    </div>
                    <button type="button" onClick={handleLogout} aria-label="Cerrar sesion" title="Cerrar sesion">
                        <Icon className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 8V5H5v14h9v-3m-3-4h10m0 0-3-3m3 3-3 3" /></Icon>
                    </button>
                </header>

                <div className="mobile-expense-company-strip">
                    <img src={activeCompany.logo} alt="" />
                    <div>
                        <span>Empresa asignada</span>
                        <strong>{activeCompany.branchName || activeCompany.name}</strong>
                    </div>
                    <b>{captureUser?.username || user?.email?.split('@')[0]}</b>
                </div>

                <form onSubmit={handleSubmit} className="mobile-expense-form">
                    {feedback && (
                        <div className={`mobile-expense-feedback is-${feedback.type}`} role="status">
                            <Icon className="h-5 w-5">
                                {feedback.type === 'success'
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M12 3 2.8 20h18.4L12 3Z" />}
                            </Icon>
                            {feedback.message}
                        </div>
                    )}

                    <Field label="Fecha" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v3m12-3v3M4 9h16M5 5h14v15H5V5Z" /></Icon>}>
                        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                    </Field>

                    <Field label="Descripcion" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7V3Zm7 0v5h5M10 12h5m-5 4h5" /></Icon>}>
                        <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Ej: Pago de energia, salario, mantenimiento..."
                            rows="2"
                            required
                        />
                    </Field>

                    <div className="mobile-expense-two-columns">
                        <Field label="Monto C$" icon={<Icon><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M15 8.5c-.7-.5-1.7-.8-2.8-.8-1.5 0-2.7.7-2.7 1.8s1.1 1.6 2.7 2c1.7.4 2.8.9 2.8 2.1s-1.2 2-2.9 2c-1.2 0-2.3-.4-3.1-1M12 6v12" /></Icon>}>
                            <input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required />
                        </Field>
                        <Field label="Categoria" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v5l9 9 9-9-9-9H7a4 4 0 0 0-4 4Zm5 1h.01" /></Icon>}>
                            <select value={category} onChange={(event) => handleCategoryChange(event.target.value)} required>
                                <option value="">Seleccionar...</option>
                                {EXPENSE_CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </Field>
                    </div>

                    <Field label="Subcategoria" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v5l9 9 9-9-9-9H7a4 4 0 0 0-4 4Zm5 1h.01" /></Icon>}>
                        <select value={subcategory} onChange={(event) => setSubcategory(event.target.value)} disabled={!category} required>
                            <option value="">Seleccionar...</option>
                            {subcategories.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </Field>

                    <Field label="Metodo de pago" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v11H3V7Zm0 4h18M7 15h4" /></Icon>}>
                        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                            {EXPENSE_PAYMENT_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </Field>

                    {paymentMethod === TRANSFER_PAYMENT_METHOD && (
                        <div className="mobile-expense-transfer-note">
                            <Icon className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M4 5h16v14H4V5Z" /></Icon>
                            <span>Solo informativo. No genera movimientos bancarios ni cuentas por pagar.</span>
                        </div>
                    )}

                    {isProviderCredit && (
                        <section className="mobile-expense-credit-box">
                            <div className="mobile-expense-credit-heading">
                                <Icon className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14v16H5V4Zm3 4h8m-8 4h8m-8 4h4" /></Icon>
                                <div><strong>Cuenta por pagar</strong><span>Se registrara como gasto a credito.</span></div>
                            </div>
                            <Field label="Proveedor" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0" /></Icon>}>
                                <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Nombre del proveedor" required />
                            </Field>
                            <div className="mobile-expense-two-columns">
                                <Field label="Factura / referencia" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5V3Z" /></Icon>}>
                                    <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="S/N" />
                                </Field>
                                <Field label="Vencimiento" icon={<Icon><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v3m12-3v3M4 9h16M5 5h14v15H5V5Z" /></Icon>}>
                                    <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                                </Field>
                            </div>
                        </section>
                    )}

                    <section className="mobile-expense-photo-box">
                        <div className="mobile-expense-photo-heading">
                            <Icon className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h3l1.5-2h7L17 7h3v12H4V7Zm8 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                            </Icon>
                            <div>
                                <strong>Fotos del comprobante</strong>
                                <span>Opcional · maximo {MAX_EXPENSE_PHOTOS}</span>
                            </div>
                        </div>

                        {photoPreviews.length > 0 && (
                            <div className="mobile-expense-photo-grid">
                                {photoPreviews.map((preview, index) => (
                                    <div key={`${preview.file.name}-${preview.file.lastModified}-${index}`} className="mobile-expense-photo-preview">
                                        <img src={preview.url} alt={`Comprobante ${index + 1}`} />
                                        <button
                                            type="button"
                                            onClick={() => setPhotoFiles(photoFiles.filter((_, fileIndex) => fileIndex !== index))}
                                            aria-label={`Quitar foto ${index + 1}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mobile-expense-photo-actions">
                            <label className="mobile-expense-photo-button">
                                <Icon className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h3l1.5-2h7L17 7h3v12H4V7Zm8 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></Icon>
                                <span>Tomar foto</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoSelection}
                                    disabled={loading || photoFiles.length >= MAX_EXPENSE_PHOTOS}
                                />
                            </label>
                            <label className="mobile-expense-photo-button">
                                <Icon className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4V4Zm3 12 3.5-4 2.5 3 2-2.5 2 3M8.5 9h.01" /></Icon>
                                <span>Elegir galeria</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoSelection}
                                    disabled={loading || photoFiles.length >= MAX_EXPENSE_PHOTOS}
                                />
                            </label>
                        </div>
                    </section>

                    <button type="submit" className="mobile-expense-primary-button" disabled={loading}>
                        {loading
                            ? uploadProgress > 0 && uploadProgress < 1
                                ? `Subiendo fotos ${Math.round(uploadProgress * 100)}%`
                                : 'Registrando...'
                            : 'Registrar gasto'}
                    </button>
                    <p className="mobile-expense-form-footnote">
                        {isProviderCredit ? 'El saldo aparecera inmediatamente en Cuentas por Pagar.' : 'Verifique los datos antes de registrar.'}
                    </p>
                </form>
            </section>
        </main>
    );
}
