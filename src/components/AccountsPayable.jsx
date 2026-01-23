// src/components/AccountsPayable.jsx
import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, Timestamp, runTransaction, query, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
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
    
    // Datos de Firebase provenientes de App.jsx
    const facturas = data.cuentas_por_pagar || [];
    const abonos = data.abonos_pagar || [];
    const listaProveedores = data.proveedores || []; // Base de datos de proveedores

    // --- LÓGICA DE FACTURAS ---
    const [facturaForm, setFacturaForm] = useState({
        fecha: new Date().toISOString().substring(0, 10),
        proveedor: '',
        numero: '',
        vencimiento: '',
        monto: ''
    });

    const handleSaveFactura = async (e) => {
        e.preventDefault();
        if (!facturaForm.proveedor || !facturaForm.monto) return alert("Seleccione un Proveedor y asigne un Monto");
        
        setLoading(true);
        try {
            await addDoc(collection(db, 'cuentas_por_pagar'), {
                ...facturaForm,
                monto: parseFloat(facturaForm.monto),
                saldo: parseFloat(facturaForm.monto),
                estado: 'pendiente',
                timestamp: Timestamp.now()
            });
            setFacturaForm({ ...facturaForm, numero: '', monto: '', vencimiento: '' });
            alert("Factura guardada correctamente");
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // --- GESTIÓN DE BASE DE DATOS DE PROVEEDORES ---
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

    const handleDeleteProveedor = async (id) => {
        if (!window.confirm("¿Eliminar este proveedor de la base de datos?")) return;
        await deleteDoc(doc(db, 'proveedores', id));
    };

    // --- LÓGICA DE ABONOS ---
    const [showModalAbono, setShowModalAbono] = useState(false);
    const [selectedFacturas, setSelectedFacturas] = useState([]);
    const [montoAbono, setMontoAbono] = useState('');
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');

    const facturasPorProveedor = useMemo(() => {
        const groups = {};
        facturas.forEach(f => {
            if (!groups[f.proveedor]) groups[f.proveedor] = { saldoTotal: 0, items: [] };
            groups[f.proveedor].items.push(f);
            if (f.estado !== 'pagado') groups[f.proveedor].saldoTotal += f.saldo;
        });
        return groups;
    }, [facturas]);

    const handleRealizarAbono = async () => {
        const monto = parseFloat(montoAbono);
        if (isNaN(monto) || monto <= 0 || selectedFacturas.length === 0) return alert("Datos inválidos");

        setLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                const q = query(collection(db, 'abonos_pagar'), orderBy('secuencia', 'desc'), limit(1));
                const snap = await getDocs(q);
                const ultimaSecuencia = snap.empty ? 0 : snap.docs[0].data().secuencia;
                const nuevaSecuencia = ultimaSecuencia + 1;

                let montoRestante = monto;
                const facturasIds = [];

                for (const fId of selectedFacturas) {
                    if (montoRestante <= 0) break;
                    const fRef = doc(db, 'cuentas_por_pagar', fId);
                    const fDoc = await transaction.get(fRef);
                    const fData = fDoc.data();
                    const pagoParaEstaFactura = Math.min(fData.saldo, montoRestante);
                    const nuevoSaldo = fData.saldo - pagoParaEstaFactura;
                    transaction.update(fRef, { saldo: nuevoSaldo, estado: nuevoSaldo <= 0 ? 'pagado' : 'parcial' });
                    montoRestante -= pagoParaEstaFactura;
                    facturasIds.push(fId);
                }

                transaction.set(doc(collection(db, 'abonos_pagar')), {
                    fecha: new Date().toISOString().substring(0, 10),
                    monto: monto,
                    proveedor: proveedorSeleccionado,
                    facturasIds,
                    secuencia: nuevaSecuencia,
                    timestamp: Timestamp.now()
                });
            });
            setShowModalAbono(false);
            setMontoAbono('');
            setSelectedFacturas([]);
            alert("Abono realizado con éxito");
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-blue-900">Control de Cuentas por Pagar</h2>
            
            <div className="flex border-b mb-6 overflow-x-auto">
                {['Ingresar Factura', 'Proveedores', 'Gestionar Base Proveedores'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* PESTAÑA 1: FORMULARIO CON DROPDOWN */}
            {activeTab === 'Ingresar Factura' && (
                <div className="max-w-md">
                    <Card title="Datos de la Factura">
                        <form onSubmit={handleSaveFactura} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500">Proveedor (Seleccionar de lista)</label>
                                <select 
                                    className="w-full border rounded-lg p-2 bg-white" 
                                    value={facturaForm.proveedor} 
                                    onChange={e => setFacturaForm({...facturaForm, proveedor: e.target.value})}
                                    required
                                >
                                    <option value="">-- Seleccione un proveedor --</option>
                                    {listaProveedores.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(p => (
                                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-gray-500">Fecha</label>
                                <input type="date" className="w-full border rounded p-2" value={facturaForm.fecha} onChange={e => setFacturaForm({...facturaForm, fecha: e.target.value})} required /></div>
                                <div><label className="text-xs font-bold uppercase text-gray-500">N° Factura</label>
                                <input type="text" className="w-full border rounded p-2" value={facturaForm.numero} onChange={e => setFacturaForm({...facturaForm, numero: e.target.value})} /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-gray-500">Monto</label>
                                <input type="number" step="0.01" className="w-full border rounded p-2" value={facturaForm.monto} onChange={e => setFacturaForm({...facturaForm, monto: e.target.value})} required /></div>
                                <div><label className="text-xs font-bold uppercase text-gray-500">Vencimiento</label>
                                <input type="date" className="w-full border rounded p-2" value={facturaForm.vencimiento} onChange={e => setFacturaForm({...facturaForm, vencimiento: e.target.value})} /></div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold">
                                {loading ? 'Guardando...' : 'Guardar Factura'}
                            </button>
                        </form>
                    </Card>
                </div>
            )}

            {/* PESTAÑA 2: ESTADO DE CUENTA */}
            {activeTab === 'Proveedores' && (
                <div className="grid grid-cols-1 gap-6">
                    {Object.keys(facturasPorProveedor).length === 0 ? <p className="text-center text-gray-400 py-10">No hay facturas registradas aún.</p> : null}
                    {Object.keys(facturasPorProveedor).map(prov => (
                        <Card key={prov} title={`${prov} (Saldo Pendiente: ${fmt(facturasPorProveedor[prov].saldoTotal)})`}>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-gray-500">{facturasPorProveedor[prov].items.filter(i => i.estado !== 'pagado').length} Facturas pendientes</span>
                                <button onClick={() => { setProveedorSeleccionado(prov); setShowModalAbono(true); }} className="bg-emerald-600 text-white px-4 py-1 rounded text-sm hover:bg-emerald-700">Realizar Abono</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2">Fecha</th>
                                            <th className="p-2">Factura</th>
                                            <th className="p-2 text-right">Monto</th>
                                            <th className="p-2 text-right">Saldo</th>
                                            <th className="p-2 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {facturasPorProveedor[prov].items.map(f => (
                                            <tr key={f.id} className="border-t">
                                                <td className="p-2">{f.fecha}</td>
                                                <td className="p-2">{f.numero || 'S/N'}</td>
                                                <td className="p-2 text-right">{fmt(f.monto)}</td>
                                                <td className="p-2 text-right font-bold text-red-600">{fmt(f.saldo)}</td>
                                                <td className="p-2 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {f.estado.toUpperCase()}
                                                    </span>
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

            {/* PESTAÑA 3: GESTIÓN DE LA BASE DE DATOS DE PROVEEDORES */}
            {activeTab === 'Gestionar Base Proveedores' && (
                <div className="max-w-md">
                    <Card title="Añadir Nuevo Proveedor a la Base">
                        <form onSubmit={handleAddProveedor} className="flex gap-2 mb-6">
                            <input 
                                type="text" 
                                className="flex-1 border rounded-lg px-3 py-2" 
                                placeholder="Nombre del proveedor..." 
                                value={nuevoProveedor}
                                onChange={e => setNuevoProveedor(e.target.value)}
                            />
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                Agregar
                            </button>
                        </form>
                        <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                            {listaProveedores.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(p => (
                                <div key={p.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                    <span className="font-medium text-gray-700">{p.nombre}</span>
                                    <button onClick={() => handleDeleteProveedor(p.id)} className="text-red-500 hover:text-red-700 p-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            ))}
                            {listaProveedores.length === 0 && <p className="p-4 text-center text-gray-400">Base de datos vacía.</p>}
                        </div>
                    </Card>
                </div>
            )}

            {/* MODAL DE ABONO (Mismo de antes) */}
            {showModalAbono && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-4 uppercase text-blue-900">Abonar a: {proveedorSeleccionado}</h3>
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-600">Seleccione Factura(s) a pagar:</label>
                            <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                                {facturasPorProveedor[proveedorSeleccionado].items
                                    .filter(f => f.estado !== 'pagado')
                                    .map(f => (
                                        <label key={f.id} className="flex items-center space-x-2 p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 cursor-pointer mb-1">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-blue-600"
                                                checked={selectedFacturas.includes(f.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedFacturas([...selectedFacturas, f.id]);
                                                    else setSelectedFacturas(selectedFacturas.filter(id => id !== f.id));
                                                }}
                                            />
                                            <div className="flex-1 text-xs">
                                                <div className="font-bold">Factura: {f.numero || 'S/N'} ({f.fecha})</div>
                                                <div className="text-red-600 font-medium">Saldo: {fmt(f.saldo)}</div>
                                            </div>
                                        </label>
                                    ))}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Monto Total a Abonar</label>
                                <input 
                                    type="number" 
                                    className="w-full border-2 border-blue-100 rounded-lg p-3 text-2xl font-bold text-blue-900" 
                                    value={montoAbono} 
                                    onChange={e => setMontoAbono(e.target.value)}
                                    placeholder="0.00"
                                />
                                <p className="text-[10px] text-gray-400 mt-2 uppercase">* El monto se distribuirá automáticamente entre las facturas marcadas.</p>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button onClick={() => setShowModalAbono(false)} className="flex-1 border py-2 rounded-lg font-bold text-gray-500">Cancelar</button>
                                <button 
                                    onClick={handleRealizarAbono} 
                                    disabled={loading || !montoAbono || selectedFacturas.length === 0} 
                                    className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : 'Confirmar Pago'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}