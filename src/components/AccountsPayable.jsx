// src/components/AccountsPayable.jsx
import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, doc, Timestamp, runTransaction, 
    query, orderBy, limit, getDocs, deleteDoc 
} from 'firebase/firestore';
import { fmt } from '../constants';

const Card = ({ title, children, className = '', right }) => (
    <div className={`rounded-2xl shadow-sm border border-neutral-200 bg-white p-4 ${className}`}>
        <div className="flex justify-between items-center mb-3">
            <div className="text-lg font-semibold text-neutral-700">{title}</div>
            {right}
        </div>
        {children}
    </div>
);

export function AccountsPayable({ data }) {
    const [activeTab, setActiveTab] = useState('Ingresar Factura');
    const [loading, setLoading] = useState(false);
    const [nuevoProveedor, setNuevoProveedor] = useState('');
    
    const facturas = data.cuentas_por_pagar || [];
    const abonos = data.abonos_pagar || [];
    const listaProveedores = data.proveedores || [];

    const [facturaForm, setFacturaForm] = useState({
        fecha: new Date().toISOString().substring(0, 10),
        proveedor: '',
        numero: '',
        vencimiento: '',
        monto: ''
    });

    // --- 1. LÓGICA DE GUARDADO ---
    const handleSaveFactura = async (e) => {
        e.preventDefault();
        const montoNum = parseFloat(facturaForm.monto);
        if (!facturaForm.proveedor || isNaN(montoNum) || montoNum <= 0) return alert("Datos inválidos.");

        setLoading(true);
        try {
            await addDoc(collection(db, 'cuentas_por_pagar'), {
                fecha: facturaForm.fecha,
                proveedor: facturaForm.proveedor,
                numero: facturaForm.numero?.trim() || "S/N",
                vencimiento: facturaForm.vencimiento || "",
                monto: montoNum,
                saldo: montoNum,
                estado: 'pendiente',
                timestamp: Timestamp.now()
            });
            setFacturaForm({ ...facturaForm, numero: '', monto: '', vencimiento: '' });
            alert("✅ Factura registrada.");
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    // --- 2. LÓGICA DE ABONOS (DISTRIBUCIÓN AUTOMÁTICA) ---
    const [showModalAbono, setShowModalAbono] = useState(false);
    const [selectedFacturas, setSelectedFacturas] = useState([]);
    const [montoAbono, setMontoAbono] = useState('');
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');

const handleRealizarAbono = async () => {
    const montoTotalAbono = parseFloat(montoAbono);
    if (isNaN(montoTotalAbono) || montoTotalAbono <= 0 || selectedFacturas.length === 0) return;

    setLoading(true);
    try {
        // 1. LEER FUERA: Obtenemos la secuencia antes de entrar a la transacción
        const q = query(collection(db, 'abonos_pagar'), orderBy('secuencia', 'desc'), limit(1));
        const snap = await getDocs(q);
        const nuevaSecuencia = snap.empty ? 1 : (snap.docs[0].data().secuencia + 1);

        await runTransaction(db, async (transaction) => {
            let restante = montoTotalAbono;
            const facturasAfectadas = [];

            // 2. LEER DENTRO: Primero obtenemos todos los documentos de las facturas (READS)
            const refsYDocs = [];
            for (const fId of selectedFacturas) {
                const ref = doc(db, 'cuentas_por_pagar', fId);
                const snapshot = await transaction.get(ref); // Lectura
                if (!snapshot.exists()) throw "Una de las facturas no existe";
                refsYDocs.push({ ref, snapshot, data: snapshot.data() });
            }

            // 3. PROCESAR Y ESCRIBIR (WRITES)
            // Ordenamos por fecha para aplicar el pago a la más antigua
            refsYDocs.sort((a, b) => new Date(a.data.fecha) - new Date(b.data.fecha));

            for (const item of refsYDocs) {
                if (restante <= 0) break;

                const pagoParaEstaFactura = Math.min(item.data.saldo, restante);
                const nuevoSaldo = Number((item.data.saldo - pagoParaEstaFactura).toFixed(2));

                // Realizamos la actualización (Escritura)
                transaction.update(item.ref, {
                    saldo: nuevoSaldo,
                    estado: nuevoSaldo <= 0 ? 'pagado' : 'parcial'
                });

                facturasAfectadas.push({ id: item.snapshot.id, montoAbonado: pagoParaEstaFactura });
                restante = Number((restante - pagoParaEstaFactura).toFixed(2));
            }

            // Guardar el abono (Escritura)
            const nuevoAbonoRef = doc(collection(db, 'abonos_pagar'));
            transaction.set(nuevoAbonoRef, {
                fecha: new Date().toISOString().substring(0, 10),
                montoTotal: montoTotalAbono,
                proveedor: proveedorSeleccionado,
                secuencia: nuevaSecuencia,
                detalleAfectado: facturasAfectadas,
                timestamp: Timestamp.now()
            });
        });

        alert(`✅ Abono #${nuevaSecuencia} procesado.`);
        setShowModalAbono(false);
        setMontoAbono('');
        setSelectedFacturas([]);
    } catch (e) {
        console.error("Error en abono:", e);
        alert("Error: " + e);
    }
    setLoading(false);
};

    // --- 3. ANULAR ABONO (REVERTIR EXACTAMENTE) ---
    // --- 3. ANULAR ABONO (CORREGIDO: LECTURAS ANTES QUE ESCRITURAS) ---
const handleDeleteAbono = async (abonoDoc) => {
    if (!window.confirm(`¿Anular abono #${abonoDoc.secuencia}? Las facturas recuperarán su saldo anterior.`)) return;
    
    setLoading(true);
    try {
        await runTransaction(db, async (transaction) => {
            // 1. PRIMERO TODAS LAS LECTURAS (READS)
            // Creamos un array con los datos actuales de las facturas antes de modificar nada
            const facturasParaActualizar = [];
            
            for (const item of abonoDoc.detalleAfectado || []) {
                const fRef = doc(db, 'cuentas_por_pagar', item.id);
                const fDoc = await transaction.get(fRef); // Lectura
                
                if (fDoc.exists()) {
                    facturasParaActualizar.push({
                        ref: fRef,
                        snapshot: fDoc,
                        montoAbonado: item.montoAbonado
                    });
                }
            }

            // 2. LUEGO TODAS LAS ESCRITURAS (WRITES)
            for (const fObj of facturasParaActualizar) {
                const dataF = fObj.snapshot.data();
                const nuevoSaldo = Number((dataF.saldo + fObj.montoAbonado).toFixed(2));
                
                transaction.update(fObj.ref, {
                    saldo: nuevoSaldo,
                    // Si el nuevo saldo es igual o mayor al monto original, vuelve a 'pendiente'
                    estado: nuevoSaldo >= dataF.monto ? 'pendiente' : 'parcial'
                });
            }

            // Borrar el documento del abono (Escritura)
            transaction.delete(doc(db, 'abonos_pagar', abonoDoc.id));
        });
        
        alert("✅ Abono anulado y saldos restaurados.");
    } catch (e) { 
        console.error(e);
        alert("Error al anular: " + e.message); 
    }
    setLoading(false);
};

    // --- 4. CÁLCULOS FILTRANDO PAGADAS Y ORDENANDO POR FECHA ---
    const { facturasPorProveedor, saldoTotalGeneral } = useMemo(() => {
        const groups = {};
        let totalGeneral = 0;

        // Ordenar todas las facturas por fecha (Mejora 3)
        const facturasOrdenadas = [...facturas].sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

        facturasOrdenadas.forEach(f => {
            // Esconder las pagadas (Solo mostrar pendiente o parcial)
            if (f.estado !== 'pagado') {
                if (!groups[f.proveedor]) groups[f.proveedor] = { saldoTotal: 0, items: [] };
                groups[f.proveedor].items.push(f);
                groups[f.proveedor].saldoTotal += (f.saldo || 0);
                totalGeneral += (f.saldo || 0);
            }
        });

        return { facturasPorProveedor: groups, saldoTotalGeneral: totalGeneral };
    }, [facturas]);

    const getVencimientoStyle = (fechaVenc) => {
        if (!fechaVenc) return "text-slate-500";
        const hoy = new Date(new Date().toISOString().substring(0, 10));
        const venc = new Date(fechaVenc);
        const diffDays = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return "bg-red-500 text-white font-bold px-2 rounded"; // Vencida
        if (diffDays <= 3) return "bg-yellow-400 text-black font-bold px-2 rounded"; // Por vencer
        return "text-slate-600";
    };

    const handleAddProveedor = async (e) => {
        e.preventDefault();
        if (!nuevoProveedor.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'proveedores'), { nombre: nuevoProveedor.trim().toUpperCase() });
            setNuevoProveedor('');
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <h2 className="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tighter">Cuentas por Pagar</h2>
            
            <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-xl shadow-sm">
                {['Ingresar Factura', 'Estado de Cuenta', 'Historial Abonos', 'Base de Proveedores'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`py-3 px-6 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === tab ? 'border-b-4 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}>{tab}</button>
                ))}
            </div>

            {/* TAB: INGRESAR FACTURA */}
            {activeTab === 'Ingresar Factura' && (
                <div className="max-w-md mx-auto">
                    <Card title="Nueva Factura de Compra">
                        <form onSubmit={handleSaveFactura} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Proveedor</label>
                                <select className="w-full border-2 rounded-xl p-3 bg-slate-50 font-semibold outline-none focus:border-blue-500" value={facturaForm.proveedor} onChange={e => setFacturaForm({...facturaForm, proveedor: e.target.value})} required>
                                    <option value="">-- Seleccionar --</option>
                                    {listaProveedores.sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Emisión</label>
                                <input type="date" className="w-full border-2 rounded-xl p-3 bg-slate-50" value={facturaForm.fecha} onChange={e => setFacturaForm({...facturaForm, fecha: e.target.value})} required /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Vencimiento</label>
                                <input type="date" className="w-full border-2 rounded-xl p-3 bg-slate-50" value={facturaForm.vencimiento} onChange={e => setFacturaForm({...facturaForm, vencimiento: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">N° Factura</label>
                                <input type="text" className="w-full border-2 rounded-xl p-3 bg-slate-50" value={facturaForm.numero} onChange={e => setFacturaForm({...facturaForm, numero: e.target.value})} placeholder="Ej: 890" /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Monto C$</label>
                                <input type="number" step="0.01" className="w-full border-2 rounded-xl p-3 bg-slate-50 text-xl font-black text-blue-700" value={facturaForm.monto} onChange={e => setFacturaForm({...facturaForm, monto: e.target.value})} required /></div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Guardar Factura</button>
                        </form>
                    </Card>
                </div>
            )}

            {/* TAB: ESTADO DE CUENTA */}
            {activeTab === 'Estado de Cuenta' && (
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-center shadow-xl border-b-4 border-red-500">
                        <span className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">Saldo Total Pendiente</span>
                        <div className="text-4xl font-black text-white mt-1">{fmt(saldoTotalGeneral)}</div>
                    </div>

                    {Object.keys(facturasPorProveedor).length === 0 ? (
                        <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase">No hay deudas pendientes</div>
                    ) : Object.keys(facturasPorProveedor).map(prov => (
                        <Card key={prov} title={prov} right={<span className="font-black text-red-600 text-xl">{fmt(facturasPorProveedor[prov].saldoTotal)}</span>}>
                            <div className="flex justify-end mb-4">
                                <button onClick={() => { setProveedorSeleccionado(prov); setShowModalAbono(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 transition-all">Realizar Abono</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead className="text-gray-400 uppercase font-black border-b border-slate-100">
                                        <tr>
                                            <th className="p-2">Fecha</th>
                                            <th className="p-2">Factura</th>
                                            <th className="p-2">Vencimiento</th>
                                            <th className="p-2 text-right">Saldo</th>
                                            <th className="p-2 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {facturasPorProveedor[prov].items.map(f => (
                                            <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2 font-semibold text-slate-600">{f.fecha}</td>
                                                <td className="p-2 font-bold text-slate-800">{f.numero}</td>
                                                <td className="p-2">
                                                    <span className={getVencimientoStyle(f.vencimiento)}>{f.vencimiento || '---'}</span>
                                                </td>
                                                <td className="p-2 text-right font-black text-red-600">{fmt(f.saldo)}</td>
                                                <td className="p-2 text-right">
                                                    <button onClick={() => { if(window.confirm('¿Eliminar factura?')) deleteDoc(doc(db, 'cuentas_por_pagar', f.id))}} className="text-slate-300 hover:text-red-500">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* TAB: HISTORIAL ABONOS */}
            {activeTab === 'Historial Abonos' && (
                <Card title="Abonos Realizados">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-gray-400 uppercase font-black">
                                <tr>
                                    <th className="p-3">Recibo</th>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Proveedor</th>
                                    <th className="p-3 text-right">Monto</th>
                                    <th className="p-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {abonos.sort((a,b) => b.secuencia - a.secuencia).map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-blue-600">#{a.secuencia}</td>
                                        <td className="p-3">{a.fecha}</td>
                                        <td className="p-3 font-bold">{a.proveedor}</td>
                                        <td className="p-3 text-right font-black text-emerald-600">{fmt(a.montoTotal)}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleDeleteAbono(a)} className="text-red-500 font-bold uppercase text-[10px] hover:underline">Anular</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB: BASE PROVEEDORES */}
            {activeTab === 'Base de Proveedores' && (
                <div className="max-w-md mx-auto">
                    <Card title="Directorio de Proveedores">
                        <form onSubmit={handleAddProveedor} className="flex gap-2 mb-4">
                            <input type="text" className="flex-1 border-2 rounded-xl px-3 uppercase text-xs font-bold" placeholder="Nombre..." value={nuevoProveedor} onChange={e => setNuevoProveedor(e.target.value)} />
                            <button className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase">Añadir</button>
                        </form>
                        <div className="border rounded-xl divide-y overflow-hidden shadow-sm">
                            {listaProveedores.sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(p => (
                                <div key={p.id} className="p-3 flex justify-between bg-white hover:bg-gray-50 items-center">
                                    <span className="font-bold text-slate-700 text-xs">{p.nombre}</span>
                                    <button onClick={() => deleteDoc(doc(db, 'proveedores', p.id))} className="text-red-300 hover:text-red-500 text-[10px] uppercase font-black">Quitar</button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* MODAL ABONO */}
            {showModalAbono && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-black mb-4 text-slate-800 uppercase italic">Abonar a {proveedorSeleccionado}</h3>
                        <div className="space-y-4">
                            <div className="max-h-48 overflow-y-auto border rounded-xl p-2 bg-slate-50">
                                {facturasPorProveedor[proveedorSeleccionado]?.items.map(f => (
                                    <label key={f.id} className="flex items-center p-2 mb-1 bg-white rounded border cursor-pointer hover:border-blue-400 transition-all">
                                        <input type="checkbox" className="w-4 h-4 mr-3 accent-blue-600" checked={selectedFacturas.includes(f.id)} onChange={(e) => e.target.checked ? setSelectedFacturas([...selectedFacturas, f.id]) : setSelectedFacturas(selectedFacturas.filter(id => id !== f.id))} />
                                        <div className="flex-1 text-[11px] font-bold">Fac: {f.numero} ({f.fecha})</div>
                                        <div className="text-xs font-black text-red-600">{fmt(f.saldo)}</div>
                                    </label>
                                ))}
                            </div>
                            <button onClick={() => setSelectedFacturas(facturasPorProveedor[proveedorSeleccionado].items.map(f => f.id))} type="button" className="w-full text-[10px] bg-slate-200 py-2 rounded font-black uppercase">Seleccionar todas</button>
                            <input type="number" className="w-full border-4 border-blue-100 rounded-xl p-4 text-3xl font-black text-blue-800 text-center" value={montoAbono} onChange={e => setMontoAbono(e.target.value)} placeholder="0.00" />
                            <div className="flex gap-2">
                                <button onClick={() => {setShowModalAbono(false); setMontoAbono(''); setSelectedFacturas([]);}} className="flex-1 py-3 font-bold text-gray-400 uppercase text-xs">Cancelar</button>
                                <button onClick={handleRealizarAbono} disabled={loading || !montoAbono || selectedFacturas.length === 0} className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-black uppercase shadow-lg transition-all">Confirmar Pago</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}