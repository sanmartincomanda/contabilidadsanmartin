import React, { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Card = ({ title, eyebrow, children, className = '' }) => (
    <div className={`erp-panel erp-panel-hover overflow-hidden rounded-[24px] ${className}`}>
        <div className="erp-panel-header px-5 py-4">
            {eyebrow && <div className="erp-page-title">{eyebrow}</div>}
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#16222d]">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

export default function CategoryManager({ categories }) {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'categorias'), {
                name: newCategoryName.trim(),
            });
            setNewCategoryName('');
        } catch (error) {
            console.error('Error al agregar categoria:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategory = async (id) => {
        if (!editingName.trim()) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'categorias', id), { name: editingName.trim() });
            setEditingId(null);
            setEditingName('');
        } catch (error) {
            console.error('Error al actualizar categoria:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Eliminar esta categoria?')) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'categorias', id));
        } catch (error) {
            console.error('Error al eliminar categoria:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="erp-panel overflow-hidden rounded-[24px]">
                <div className="erp-panel-header flex flex-wrap items-end justify-between gap-4 px-5 py-4">
                    <div>
                        <div className="erp-page-title">Master data</div>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Categorias</h1>
                    </div>
                    <span className="erp-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                        {categories.length} activas
                    </span>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <Card title="Nueva categoria" eyebrow="Captura">
                    <div className="space-y-4">
                        <div className="erp-filter-panel p-4">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#5f7280]">
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Ej. Sueldos, alquiler, transporte"
                                className="erp-focus block h-12 w-full rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-semibold text-[#16222d] shadow-[inset_0_1px_2px_rgba(15,23,42,.04)] disabled:opacity-60"
                                disabled={loading}
                            />
                        </div>

                        <button
                            onClick={handleAddCategory}
                            disabled={loading || !newCategoryName.trim()}
                            className="erp-pressable flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#112131_0%,#173042_68%,#1a6f93_100%)] px-4 text-sm font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_18px_32px_-18px_rgba(14,23,34,.72)] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            {loading ? 'Guardando' : 'Agregar'}
                        </button>
                    </div>
                </Card>

                <Card title="Base de categorias" eyebrow="Listado">
                    {categories.length === 0 ? (
                        <div className="erp-empty-state px-6 py-12 text-center">
                            <div className="text-sm font-semibold text-[#5f7280]">No hay categorias registradas.</div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[...categories]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((cat) => (
                                    <div
                                        key={cat.id}
                                        className="erp-metric-card flex items-center justify-between gap-3 px-4 py-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173042] text-sm font-bold text-white">
                                                {cat.name?.charAt(0)?.toUpperCase() || 'C'}
                                            </div>
                                            {editingId === cat.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="erp-focus h-11 w-full rounded-2xl border border-[#ccd7df] bg-white px-4 text-sm font-semibold text-[#16222d]"
                                                />
                                            ) : (
                                                <div className="truncate text-sm font-semibold text-[#22313f]">{cat.name}</div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {editingId === cat.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateCategory(cat.id)}
                                                        disabled={loading}
                                                        className="erp-pressable rounded-xl bg-[#173042] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50"
                                                    >
                                                        Guardar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(null);
                                                            setEditingName('');
                                                        }}
                                                        disabled={loading}
                                                        className="erp-pressable rounded-xl border border-[#ccd7df] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#556774] disabled:opacity-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(cat.id);
                                                            setEditingName(cat.name);
                                                        }}
                                                        disabled={loading}
                                                        className="erp-pressable rounded-xl border border-[#ccd7df] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#556774] disabled:opacity-50"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                        disabled={loading}
                                                        className="erp-pressable rounded-xl border border-[#f0c9cc] bg-[#fff7f7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#a81d24] disabled:opacity-50"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
