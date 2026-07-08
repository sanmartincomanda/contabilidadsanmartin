import React, { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt } from '../constants';
import { getLocalDateString } from '../utils/localDate';
import {
    CASH_PAYMENT_METHOD,
    CREDIT_CARD_ID,
    CREDIT_CARD_PAYMENT_METHOD,
    CREDIT_CARD_MOVEMENTS_COLLECTION,
    CREDIT_CARD_NAME,
    PAYABLE_PAYMENT_METHOD_OPTIONS,
    TRANSFER_PAYMENT_METHOD,
    addCreditCardPayment,
    getPaymentMethodLabel,
} from '../services/creditCardLiabilities';

const Icons = {
    creditCard: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    wallet: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    fileText: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    dollar: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    chevronRight: 'M9 5l7 7-7 7',
};

const Icon = ({ path, className = 'h-5 w-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const Button = ({ children, variant = 'primary', disabled, className = '', ...props }) => {
    const variants = {
        primary: 'bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] text-white hover:brightness-[1.04]',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
        ghost: 'border border-[#c5dce7] bg-white text-[#45606d] hover:bg-[#f3f9fc]',
        danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    };

    return (
        <button
            className={`erp-pressable rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

const Input = ({ label, icon, className = '', ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-widest text-[#61727f]">{label}</label>
        <div className="relative">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72909d]" />}
            <input
                className={`w-full rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 text-sm font-semibold text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12 ${icon ? 'pl-10' : ''} ${className}`}
                {...props}
            />
        </div>
    </div>
);

const Select = ({ label, icon, options, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-widest text-[#61727f]">{label}</label>
        <div className="relative">
            {icon && <Icon path={Icons[icon]} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72909d]" />}
            <select
                className={`w-full appearance-none rounded-2xl border border-[#bdd5e1] bg-[#f7fbfd] px-3.5 py-2.5 pr-9 text-sm font-semibold text-[#173545] outline-none transition-all focus:border-[#0a628f] focus:ring-2 focus:ring-[#0a628f]/12 ${icon ? 'pl-10' : ''}`}
                {...props}
            >
                {options}
            </select>
            <Icon path={Icons.chevronRight} className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-[#72909d]" />
        </div>
    </div>
);

const Badge = ({ children, tone = 'neutral' }) => {
    const tones = {
        neutral: 'border-slate-200 bg-slate-50 text-slate-600',
        charge: 'border-red-200 bg-red-50 text-red-700',
        payment: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        card: 'border-violet-200 bg-violet-50 text-violet-700',
    };

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${tones[tone]}`}>
            {children}
        </span>
    );
};

export default function Liabilities({ data = {} }) {
    const [paymentDate, setPaymentDate] = useState(getLocalDateString());
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(TRANSFER_PAYMENT_METHOD);
    const [description, setDescription] = useState(`ABONO ${CREDIT_CARD_NAME}`);
    const [loading, setLoading] = useState(false);

    const movements = useMemo(() => {
        return (data[CREDIT_CARD_MOVEMENTS_COLLECTION] || [])
            .filter((item) => (item.cardId || CREDIT_CARD_ID) === CREDIT_CARD_ID)
            .map((item) => ({
                ...item,
                amount: Number(item.amount || 0),
                type: item.type || 'cargo',
                status: item.status || 'activo',
            }))
            .filter((item) => item.status !== 'anulado')
            .sort((a, b) => {
                const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
                if (dateCompare !== 0) return dateCompare;
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });
    }, [data]);

    const totals = useMemo(() => {
        const cargos = movements
            .filter((item) => item.type === 'cargo')
            .reduce((sum, item) => sum + item.amount, 0);
        const abonos = movements
            .filter((item) => item.type === 'abono')
            .reduce((sum, item) => sum + item.amount, 0);

        return {
            cargos,
            abonos,
            saldo: cargos - abonos,
            count: movements.length,
        };
    }, [movements]);

    const handlePayment = async (event) => {
        event.preventDefault();
        const amount = Number(paymentAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            alert('Ingrese un monto valido.');
            return;
        }

        setLoading(true);
        try {
            await addCreditCardPayment({
                date: paymentDate,
                amount,
                description,
                paymentMethod,
            });
            setPaymentAmount('');
            setDescription(`ABONO ${CREDIT_CARD_NAME}`);
        } catch (error) {
            console.error('Error abonando tarjeta:', error);
            alert('No se pudo registrar el abono: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePayment = async (movement) => {
        if (movement.type !== 'abono' || movement.sourceCollection !== 'pasivos') return;
        if (!window.confirm('Eliminar este abono de tarjeta?')) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, CREDIT_CARD_MOVEMENTS_COLLECTION, movement.id));
        } catch (error) {
            console.error('Error eliminando abono de tarjeta:', error);
            alert('No se pudo eliminar el abono: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="erp-panel overflow-hidden rounded-[24px]">
                <div className="erp-panel-header flex flex-wrap items-end justify-between gap-4 px-5 py-4">
                    <div>
                        <div className="erp-page-title">Liabilities</div>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Pasivos</h1>
                    </div>
                    <Badge tone="card">Tarjetas de credito</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
                <section className="erp-panel overflow-hidden rounded-[28px]">
                    <div className="border-b border-[#c5dce7] bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] px-5 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12">
                                    <Icon path={Icons.creditCard} className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8db2c4]">Tarjeta activa</div>
                                    <h2 className="mt-1 text-xl font-black">{CREDIT_CARD_NAME}</h2>
                                </div>
                            </div>
                            <div className="rounded-3xl border border-white/12 bg-white/10 px-5 py-3 text-right">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9fc8d7]">Saldo actual</div>
                                <div className="mt-1 text-3xl font-black tracking-tight">{fmt(totals.saldo)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 border-b border-[#dbe7ee] bg-[#f7fbfd] p-5 md:grid-cols-3">
                        <div className="erp-metric-card p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargos</div>
                            <div className="mt-1 text-xl font-black text-red-700">{fmt(totals.cargos)}</div>
                        </div>
                        <div className="erp-metric-card p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Abonos</div>
                            <div className="mt-1 text-xl font-black text-emerald-700">{fmt(totals.abonos)}</div>
                        </div>
                        <div className="erp-metric-card p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Movimientos</div>
                            <div className="mt-1 text-xl font-black text-[#16222d]">{totals.count}</div>
                        </div>
                    </div>

                    <div className="p-5">
                        {movements.length === 0 ? (
                            <div className="erp-empty-state px-5 py-12 text-center">
                                <Icon path={Icons.creditCard} className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-400">No hay movimientos de tarjeta todavia.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {movements.map((movement) => {
                                    const isPayment = movement.type === 'abono';
                                    const canDelete = isPayment && movement.sourceCollection === 'pasivos';
                                    return (
                                        <div key={movement.id} className="erp-mobile-record flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge tone={isPayment ? 'payment' : 'charge'}>
                                                        {isPayment ? 'Abono' : 'Cargo'}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-slate-400">{movement.date || 'Sin fecha'}</span>
                                                    <span className="text-xs font-semibold text-slate-400">{getPaymentMethodLabel(movement.paymentMethod)}</span>
                                                </div>
                                                <div className="mt-2 text-sm font-black text-[#16222d]">
                                                    {movement.description || movement.provider || 'Movimiento de tarjeta'}
                                                </div>
                                                <div className="mt-1 text-xs font-semibold text-slate-400">
                                                    {movement.provider || movement.sourceType || movement.sourceCollection || 'Pasivos'}
                                                    {movement.invoiceNumber ? ` · Factura ${movement.invoiceNumber}` : ''}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 md:justify-end">
                                                <div className={`text-right text-lg font-black ${isPayment ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {isPayment ? '-' : '+'}{fmt(movement.amount)}
                                                </div>
                                                {canDelete && (
                                                    <Button
                                                        type="button"
                                                        variant="danger"
                                                        disabled={loading}
                                                        className="px-3"
                                                        onClick={() => handleDeletePayment(movement)}
                                                    >
                                                        <Icon path={Icons.trash} className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="erp-panel h-fit overflow-hidden rounded-[28px]">
                    <div className="erp-panel-header border-b border-[#c5dce7] px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-[#eaf7fc] p-2 text-[#0a628f]">
                                <Icon path={Icons.wallet} className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5d7784]">Abonar tarjeta</div>
                                <div className="text-sm font-semibold text-slate-400">Reduce el saldo de Infinite Lafise</div>
                            </div>
                        </div>
                    </div>
                    <form onSubmit={handlePayment} className="space-y-4 p-5">
                        <Input
                            label="Fecha"
                            icon="calendar"
                            type="date"
                            value={paymentDate}
                            onChange={(event) => setPaymentDate(event.target.value)}
                            required
                        />
                        <Input
                            label="Descripcion"
                            icon="fileText"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            required
                        />
                        <Input
                            label="Monto"
                            icon="dollar"
                            type="number"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(event) => setPaymentAmount(event.target.value)}
                            className="text-lg font-black text-emerald-700"
                            placeholder="0.00"
                            required
                        />
                        <Select
                            label="Metodo del abono"
                            icon="wallet"
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
                            options={
                                <>
                                    {PAYABLE_PAYMENT_METHOD_OPTIONS
                                        .filter((option) => option.value !== CREDIT_CARD_PAYMENT_METHOD)
                                        .map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                </>
                            }
                        />
                        {paymentMethod === CASH_PAYMENT_METHOD && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                                Este abono reduce la tarjeta. No se registra como gasto, porque el gasto ya nacio cuando se uso la tarjeta.
                            </div>
                        )}
                        <Button type="submit" variant="success" disabled={loading} className="w-full">
                            {loading ? 'Guardando...' : 'Registrar abono a tarjeta'}
                        </Button>
                    </form>
                </aside>
            </div>
        </div>
    );
}
