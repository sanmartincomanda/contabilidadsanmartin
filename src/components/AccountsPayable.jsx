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
            alert("✅ Factura guardada en la base de datos.");
        } catch (error) {
            console.error("Error al guardar factura:", error);
            alert("❌ Error al guardar: " + error.message);
        }
        setLoading(false);
    };

    // --- NUEVA FUNCIÓN: BORRAR FACTURA ---
    const handleDeleteFactura = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar esta factura? Esto no afectará a los abonos ya registrados.")) return;
        try {
            await deleteDoc(doc(db, 'cuentas_por_pagar', id));
        } catch (e) {
            console.error("Error al borrar factura:", e);
        }
    };

    // --- LÓGICA DE ABONOS (MULTI-PAGO) ---
    const [showModalAbono, setShowModalAbono] = useState(false);
    const [selectedFacturas, setSelectedFacturas] = useState([]);
    const [montoAbono, setMontoAbono] = useState('');
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');

    const facturasPorProveedor = useMemo(() => {
        const groups = {};
        facturas.forEach(f => {
            if (!groups[f.proveedor]) groups[f.proveedor] = { saldoTotal: 0, items: [] };
            groups[f.proveedor].items.push(f);
            if (f.estado !== 'pagado') groups[f.proveedor].saldoTotal += (f.saldo || 0);
        });
        return groups;
    }, [facturas]);

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
                const facturasAfectadas = [];

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
                    facturasAfectadas.push({ id: fId, montoAplicado: pago });
                }

                transaction.set(doc(collection(db, 'abonos_pagar')), {
                    fecha: new Date().toISOString().substring(0, 10),
                    montoTotal: montoTotalAbono,
                    proveedor: proveedorSeleccionado,
                    secuencia: nuevaSecuencia,
                    facturas: facturasAfectadas,
                    timestamp: Timestamp.now()
                });
            });

            alert(`✅ Abono procesado con éxito.`);
            setShowModalAbono(false);
            setMontoAbono('');
            setSelectedFacturas([]);
        } catch (e) {
            console.error(e);
            alert("Error en la transacción: " + e.message);
        }
        setLoading(false);
    };

    // --- NUEVA FUNCIÓN: BORRAR ABONO ---
    const handleDeleteAbono = async (id) => {
        if (!window.confirm("¿Eliminar este abono del historial? (Nota: Esto NO restaura el saldo de las facturas)")) return;
        try {
            await deleteDoc(doc(db, 'abonos_pagar', id));
        } catch (e) {
            console.error("Error al borrar abono:", e);
        }
    };

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
            <h2 className="text-2xl font-bold mb-6 text-blue-900">Módulo de Cuentas por Pagar</h2>
            
            <div className="flex border-b mb-6 overflow-x-auto">
                {['Ingresar Factura', 'Proveedores', 'Historial Abonos', 'Base de Proveedores'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* TAB INGRESAR FACTURA */}
            {activeTab === 'Ingresar Factura' && (
                <div className="max-w-md mx-auto">
                    <Card title="Registrar Factura de Compra">
                        <form onSubmit={handleSaveFactura} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Proveedor</label>
                                <select className="w-full border rounded-lg p-2 bg-white" value={facturaForm.proveedor} onChange={e => setFacturaForm({...facturaForm, proveedor: e.target.value})} required>
                                    <option value="">-- Seleccionar --</option>
                                    {listaProveedores.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fecha</label>
                                    <input type="date" className="w-full border rounded p-2" value={facturaForm.fecha} onChange={e => setFacturaForm({...facturaForm, fecha: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">N° Factura</label>
                                    <input type="text" className="w-full border rounded p-2" value={facturaForm.numero} onChange={e => setFacturaForm({...facturaForm, numero: e.target.value})} placeholder="Ej: 001-234" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monto</label>
                                <input type="number" step="0.01" className="w-full border rounded p-2 text-lg font-bold" value={facturaForm.monto} onChange={e => setFacturaForm({...facturaForm, monto: e.target.value})} required />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Guardar Factura</button>
                        </form>
                    </Card>
                </div>
            )}

            {/* TAB ESTADO DE CUENTA POR PROVEEDOR */}
            {activeTab === 'Proveedores' && (
                <div className="space-y-6">
                    {Object.keys(facturasPorProveedor).map(prov => (
                        <Card key={prov} title={`${prov} - Saldo: ${fmt(facturasPorProveedor[prov].saldoTotal)}`}>
                            <div className="flex justify-end mb-3">
                                <button onClick={() => { setProveedorSeleccionado(prov); setShowModalAbono(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700">Abonar</button>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
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
                                        <tr key={f.id} className="border-t">
                                            <td className="p-2">{f.fecha}</td>
                                            <td className="p-2">{f.numero}</td>
                                            <td className="p-2 text-right">{fmt(f.monto)}</td>
                                            <td className="p-2 text-right font-bold text-red-600">{fmt(f.saldo)}</td>
                                            <td className="p-2 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${f.estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{f.estado.toUpperCase()}</span>
                                            </td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => handleDeleteFactura(f.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    ))}
                </div>
            )}

            {/* NUEVO TAB: HISTORIAL DE ABONOS */}
            {activeTab === 'Historial Abonos' && (
                <Card title="Abonos Registrados">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 text-left">N°</th>
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Proveedor</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abonos.sort((a,b) => b.secuencia - a.secuencia).map(a => (
                                    <tr key={a.id} className="border-t">
                                        <td className="p-2 font-bold">#{a.secuencia}</td>
                                        <td className="p-2">{a.fecha}</td>
                                        <td className="p-2">{a.proveedor}</td>
                                        <td className="p-2 text-right font-bold text-emerald-600">{fmt(a.montoTotal)}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleDeleteAbono(a.id)} className="text-red-500 hover:text-red-700">🗑️ Borrar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB GESTIÓN PROVEEDORES */}
            {activeTab === 'Base de Proveedores' && (
                <div className="max-w-md mx-auto">
                    <Card title="Añadir Proveedor">
                        <form onSubmit={handleAddProveedor} className="flex gap-2 mb-4">
                            <input type="text" className="flex-1 border rounded-lg px-3" placeholder="Nombre..." value={nuevoProveedor} onChange={e => setNuevoProveedor(e.target.value)} />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Añadir</button>
                        </form>
                        <div className="border rounded-lg divide-y">
                            {listaProveedores.map(p => (
                                <div key={p.id} className="p-3 flex justify-between bg-white hover:bg-gray-50">
                                    <span>{p.nombre}</span>
                                    <button onClick={() => deleteDoc(doc(db, 'proveedores', p.id))} className="text-red-400 text-xs">Eliminar</button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* MODAL ABONO MULTIPAGO */}
            {showModalAbono && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-blue-900">Pago: {proveedorSeleccionado}</h3>
                        <div className="space-y-4">
                            <div className="max-h-48 overflow-y-auto border rounded-xl p-2 bg-gray-50">
                                {facturasPorProveedor[proveedorSeleccionado].items.filter(f => f.estado !== 'pagado').map(f => (
                                    <label key={f.id} className="flex items-center p-3 mb-2 bg-white rounded-lg border cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 mr-3" checked={selectedFacturas.includes(f.id)} onChange={(e) => e.target.checked ? setSelectedFacturas([...selectedFacturas, f.id]) : setSelectedFacturas(selectedFacturas.filter(id => id !== f.id))} />
                                        <div className="flex-1">
                                            <div className="text-sm font-bold">Fac: {f.numero}</div>
                                            <div className="text-xs text-red-500">Saldo: {fmt(f.saldo)}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <input type="number" className="w-full border-2 border-blue-600 rounded-xl p-3 text-2xl font-black text-blue-700" value={montoAbono} onChange={e => setMontoAbono(e.target.value)} placeholder="0.00" />
                            <div className="flex gap-3">
                                <button onClick={() => setShowModalAbono(false)} className="flex-1 py-3 font-bold text-gray-500">Cancelar</button>
                                <button onClick={handleRealizarAbono} disabled={loading || !montoAbono} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}