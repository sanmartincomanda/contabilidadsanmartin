import React from 'react';

const PlaceholderCard = ({ title, value, subtitle }) => (
    <div className="erp-panel erp-panel-hover overflow-hidden rounded-[24px]">
        <div className="h-[3px] bg-[linear-gradient(90deg,#173042_0%,#1a6f93_100%)]" />
        <div className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#60717e]">{title}</div>
            <div className="mt-3 text-3xl font-black tracking-tight text-[#16222d]">{value}</div>
            <div className="mt-1 text-sm text-[#6f808d]">{subtitle}</div>
        </div>
    </div>
);

export default function DashboardGeneral() {
    return (
        <div className="space-y-5">
            <div className="erp-panel overflow-hidden rounded-[24px]">
                <div className="erp-panel-header px-5 py-4">
                    <div className="erp-page-title">Analytics</div>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#16222d]">Dashboard general</h2>
                </div>
                <div className="p-5">
                    <div className="erp-filter-panel rounded-[22px] px-5 py-6">
                        <div className="text-sm font-semibold text-[#30414f]">
                            Esta vista queda reservada para paneles ejecutivos consolidados.
                        </div>
                        <div className="mt-2 text-sm text-[#667582]">
                            La base operativa ya esta lista; aqui dejaremos analitica avanzada, comparativos y alertas.
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <PlaceholderCard title="Pipeline" value="3 modulos" subtitle="Dashboards ejecutivos pendientes" />
                <PlaceholderCard title="Datos" value="Live" subtitle="Consumo desde la operacion diaria" />
                <PlaceholderCard title="Estado" value="Base lista" subtitle="Continuar con widgets de negocio" />
            </div>
        </div>
    );
}
