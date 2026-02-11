// src/components/AccountsPayable.jsx
import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, doc, Timestamp, runTransaction, 
    query, orderBy, limit, getDocs, deleteDoc 
} from 'firebase/firestore';
import { fmt } from '../constants';

const Card = ({ title, children, className = '' }) => (
    <div className={`rounded-2xl shadow-sm border border-neutral-200 bg-white p-4 ${className}`}>
        <div className="text-lg font-semibold text-neutral-700 mb-3">{title}</div>
        {children}
    </div>
);

export function AccountsPayable({ data }) {
    const [activeTab, setActiveTab] = useState('Ingresar Factura');
    const [loading, setLoading] = useState(false);
    const [nuevoProveedor, setNuevoProveedor] = useState('');
    
    // Datos provenientes de App.jsx
    const facturas = data.cuentas_por_pagar || [];
    const abonos = data.abonos_pagar || [];
    const listaProveedores = data.proveedores || [];

    // --- FORMULARIO DE FACTURAS ---
    const [facturaForm, setFacturaForm] = useState({
        fecha: new Date().toISOString().substring(0, 10),
        proveedor: '',
        numero: '',
        vencimiento: '',
        monto: ''
    });

    const handleSaveFactura = async (e) => {
        e.preventDefault();
        if (!facturaForm.proveedor || !facturaForm.monto || parseFloat(facturaForm.monto) <= 0) {
            return alert("Por favor seleccione un proveedor y asigne un monto válido.");
        }
        
        setLoading(true);
        try {
            await addDoc(collection(db, 'cuentas_por_pagar'), {
                fecha: facturaForm.fecha,
                proveedor: facturaForm.proveedor,
                numero: facturaForm.numero || "S/N",
                vencimiento: facturaForm.vencimiento || "",
                monto: parseFloat(facturaForm.monto),
                saldo: parseFloat(facturaForm.monto),
                estado: 'pendiente',
                timestamp: Timestamp.now()
            });
            setFacturaForm({ ...facturaForm, numero: '', monto: '', vencimiento: '' });
            alert("✅ Factura guardada.");
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
        setLoading(false);
    };

    const handleDeleteFactura = async (id) => {
        if (!window.confirm("¿Eliminar esta factura?")) return;
        try {
            await deleteDoc(doc(db, 'cuentas_por_pagar', id));
        } catch (e) { console.error(e); }
    };

    // --- LÓGICA DE ABONOS ---
    const [showModalAbono, setShowModalAbono] = useState(false);
    const [selectedFacturas, setSelectedFacturas] = useState([]);
    const [montoAbono, setMontoAbono] = useState('');
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');

    // Cálculo de facturas agrupadas y SALDO TOTAL GENERAL
    const { facturasPorProveedor, saldoTotalGeneral } = useMemo(() => {
        const groups = {};
        let totalGeneral = 0;

        facturas.forEach(f => {
            if (!groups[f.proveedor]) groups[f.proveedor] = { saldoTotal: 0, items: [] };
            groups[f.proveedor].items.push(f);
            
            if (f.estado !== 'pagado') {
                groups[f.proveedor].saldoTotal += (f.saldo || 0);
                totalGeneral += (f.saldo || 0); // Suma al gran total
            }
        });

        // Ordenar proveedores alfabéticamente
        const sortedGroups = Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});

        return { facturasPorProveedor: sortedGroups, saldoTotalGeneral: totalGeneral };
    }, [facturas]);

    const ponerMontoTotal = () => {
        const total = facturas
            .filter(f => selectedFacturas.includes(f.id))
            .reduce((sum, f) => sum + (f.saldo || 0), 0);
        setMontoAbono(total.toFixed(2));
    };

    const handleRealizarAbono = async () => {
        const montoTotalAbono = parseFloat(montoAbono);
        if (isNaN(montoTotalAbono) || montoTotalAbono <= 0 || selectedFacturas.length === 0) {
            return alert("Monto o facturas no seleccionadas.");
        }

        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const q = query(collection(db, 'abonos_pagar'), orderBy('secuencia', 'desc'), limit(1));
                const snap = await getDocs(q);
                const nuevaSecuencia = snap.empty ? 1 : (snap.docs[0].data().secuencia + 1);

                let restante = montoTotalAbono;
                for (const fId of selectedFacturas) {
                    if (restante <= 0) break;
                    const fRef = doc(db, 'cuentas_por_pagar', fId);
                    const fDoc = await transaction.get(fRef);
                    if (!fDoc.exists()) continue;

                    const dataF = fDoc.data();
                    const pago = Math.min(dataF.saldo, restante);
                    const nuevoSaldo = dataF.saldo - pago;

                    transaction.update(fRef, {
                        saldo: nuevoSaldo,
                        estado: nuevoSaldo <= 0 ? 'pagado' : 'parcial'
                    });
                    restante -= pago;
                }

                transaction.set(doc(collection(db, 'abonos_pagar')), {
                    fecha: new Date().toISOString().substring(0, 10),
                    montoTotal: montoTotalAbono,
                    proveedor: proveedorSeleccionado,
                    secuencia: nuevaSecuencia,
                    timestamp: Timestamp.now()
                });
            });

            alert(`✅ Abono procesado.`);
            setShowModalAbono(false);
            setMontoAbono('');
            setSelectedFacturas([]);
        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        }
        setLoading(false);
    };

    const handleDeleteAbono = async (id) => {
        if (!window.confirm("¿Eliminar este abono del historial?")) return;
        try {
            await deleteDoc(doc(db, 'abonos_pagar', id));
        } catch (e) { console.error(e); }
    };

    // --- GESTIÓN PROVEEDORES ---
    const handleAddProveedor = async (e) => {
        e.preventDefault();
        if (!nuevoProveedor.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'proveedores'), { 
                nombre: nuevoProveedor.trim().toUpperCase() 
            });
            setNuevoProveedor('');
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-blue-900 uppercase tracking-tight">Cuentas por Pagar</h2>
            
            <div className="flex border-b mb-6 overflow-x-auto bg-white rounded-t-xl shadow-sm">
                {['Ingresar Factura', 'Estado de Cuenta', 'Historial Abonos', 'Base de Proveedores'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-3 px-6 font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* TAB: INGRESAR FACTURA */}
            {activeTab === 'Ingresar Factura' && (
                <div className="max-w-md mx-auto">
                    <Card title="Nueva Factura de Compra">
                        <form onSubmit={handleSaveFactura} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Proveedor</label>
                                <select className="w-full border rounded-lg p-2 bg-white" value={facturaForm.proveedor} onChange={e => setFacturaForm({...facturaForm, proveedor: e.target.value})} required>
                                    <option value="">-- Seleccionar --</option>
                                    {listaProveedores.sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                <input type="date" className="w-full border rounded p-2" value={facturaForm.fecha} onChange={e => setFacturaForm({...facturaForm, fecha: e.target.value})} required /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase">N° Factura</label>
                                <input type="text" className="w-full border rounded p-2" value={facturaForm.numero} onChange={e => setFacturaForm({...facturaForm, numero: e.target.value})} placeholder="001-001" /></div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Monto</label>
                                <input type="number" step="0.01" className="w-full border rounded p-2 text-xl font-bold" value={facturaForm.monto} onChange={e => setFacturaForm({...facturaForm, monto: e.target.value})} required />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase hover:bg-blue-700 shadow-md transition-all">Guardar</button>
                        </form>
                    </Card>
                </div>
            )}

            {/* TAB: ESTADO DE CUENTA (CON SALDO TOTAL GENERAL) */}
            {activeTab === 'Estado de Cuenta' && (
                <div className="space-y-6">
                    {/* RESUMEN DE SALDO TOTAL GENERAL */}
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-red-600 font-bold uppercase text-xs tracking-widest mb-1">Saldo Total por Pagar</span>
                        <span className="text-3xl font-black text-red-700">{fmt(saldoTotalGeneral)}</span>
                    </div>

                    {Object.keys(facturasPorProveedor).length === 0 ? (
                        <p className="text-center text-gray-400 py-10">No hay cuentas pendientes.</p>
                    ) : (
                        Object.keys(facturasPorProveedor).map(prov => (
                            <Card key={prov} title={`${prov} - Deuda: ${fmt(facturasPorProveedor[prov].saldoTotal)}`}>
                                <div className="flex justify-end mb-3">
                                    <button onClick={() => { setProveedorSeleccionado(prov); setShowModalAbono(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 uppercase shadow-md">Realizar Abono</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold">
                                            <tr>
                                                <th className="p-2 text-left">Fecha</th>
                                                <th className="p-2 text-left">Factura</th>
                                                <th className="p-2 text-right">Monto</th>
                                                <th className="p-2 text-right">Saldo</th>
                                                <th className="p-2 text-center">Estado</th>
                                                <th className="p-2 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {facturasPorProveedor[prov].items.map(f => (
                                                <tr key={f.id} className="border-t hover:bg-gray-50">
                                                    <td className="p-2">{f.fecha}</td>
                                                    <td className="p-2">{f.numero}</td>
                                                    <td className="p-2 text-right">{fmt(f.monto)}</td>
                                                    <td className="p-2 text-right font-bold text-red-600">{fmt(f.saldo)}</td>
                                                    <td className="p-2 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{f.estado.toUpperCase()}</span>
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <button onClick={() => handleDeleteFactura(f.id)} className="text-red-400 hover:text-red-600">🗑️</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* TAB: HISTORIAL ABONOS */}
            {activeTab === 'Historial Abonos' && (
                <Card title="Abonos Registrados">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 text-left">Recibo</th>
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Proveedor</th>
                                    <th className="p-2 text-right">Monto Pagado</th>
                                    <th className="p-2 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abonos.sort((a,b) => b.secuencia - a.secuencia).map(a => (
                                    <tr key={a.id} className="border-t hover:bg-gray-50">
                                        <td className="p-2 font-mono text-blue-600">#{a.secuencia}</td>
                                        <td className="p-2">{a.fecha}</td>
                                        <td className="p-2 font-bold">{a.proveedor}</td>
                                        <td className="p-2 text-right font-bold text-emerald-600">{fmt(a.montoTotal)}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleDeleteAbono(a.id)} className="text-red-400 hover:text-red-600">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB: BASE DE PROVEEDORES */}
            {activeTab === 'Base de Proveedores' && (
                <div className="max-w-md mx-auto">
                    <Card title="Directorio de Proveedores">
                        <form onSubmit={handleAddProveedor} className="flex gap-2 mb-4">
                            <input type="text" className="flex-1 border rounded-lg px-3 uppercase text-sm" placeholder="Nombre..." value={nuevoProveedor} onChange={e => setNuevoProveedor(e.target.value)} />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs">Añadir</button>
                        </form>
                        <div className="border rounded-xl divide-y overflow-hidden shadow-sm">
                            {listaProveedores.sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(p => (
                                <div key={p.id} className="p-3 flex justify-between bg-white hover:bg-gray-50 items-center">
                                    <span className="font-semibold text-gray-700">{p.nombre}</span>
                                    <button onClick={() => deleteDoc(doc(db, 'proveedores', p.id))} className="text-red-400 hover:text-red-600 text-xs uppercase font-bold">Quitar</button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* MODAL ABONO */}
            {showModalAbono && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-blue-900">Pago a: {proveedorSeleccionado}</h3>
                        <div className="space-y-4">
                            <div className="max-h-48 overflow-y-auto border rounded-xl p-2 bg-gray-50 shadow-inner">
                                {facturasPorProveedor[proveedorSeleccionado].items
                                    .filter(f => f.estado !== 'pagado')
                                    .map(f => (
                                        <label key={f.id} className="flex items-center p-3 mb-2 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-400 transition-all">
                                            <input type="checkbox" className="w-5 h-5 mr-3 text-blue-600 rounded" checked={selectedFacturas.includes(f.id)} onChange={(e) => e.target.checked ? setSelectedFacturas([...selectedFacturas, f.id]) : setSelectedFacturas(selectedFacturas.filter(id => id !== f.id))} />
                                            <div className="flex-1">
                                                <div className="text-sm font-bold">Fac: {f.numero}</div>
                                                <div className="text-xs text-red-500 font-bold italic">Saldo: {fmt(f.saldo)}</div>
                                            </div>
                                        </label>
                                    ))}
                            </div>
                            
                            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <span className="text-[10px] font-bold text-blue-700 uppercase">Liquidar seleccionadas:</span>
                                <button onClick={ponerMontoTotal} type="button" className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold shadow-sm hover:bg-blue-700">SUMAR TOTAL</button>
                            </div>

                            <input type="number" className="w-full border-2 border-blue-600 rounded-xl p-3 text-3xl font-black text-blue-900 text-center" value={montoAbono} onChange={e => setMontoAbono(e.target.value)} placeholder="0.00" />
                            
                            <div className="flex gap-3">
                                <button onClick={() => {setShowModalAbono(false); setMontoAbono(''); setSelectedFacturas([]);}} className="flex-1 py-3 font-bold text-gray-500">Cancelar</button>
                                <button onClick={handleRealizarAbono} disabled={loading || !montoAbono} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}