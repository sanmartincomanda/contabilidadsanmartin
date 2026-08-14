import React from 'react';

export const ERPIcon = ({ path, className = 'h-4 w-4', strokeWidth = 1.8 }) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={strokeWidth}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

export const ContextStrip = ({ items = [], className = '' }) => (
    <div className={`erp-context-strip ${className}`} aria-label="Contexto del modulo">
        {items.filter(Boolean).map((item, index) => (
            <div className="erp-context-item" key={`${item.label}-${index}`}>
                <span>{item.label}</span>
                <strong title={String(item.value || '')}>{item.value || '-'}</strong>
            </div>
        ))}
    </div>
);

export const PageHeader = ({ eyebrow, title, subtitle, breadcrumbs = [], actions, meta }) => (
    <header className="erp-page-header">
        {breadcrumbs.length > 0 && (
            <nav className="erp-breadcrumb" aria-label="Ruta de navegacion">
                {breadcrumbs.map((item, index) => (
                    <React.Fragment key={`${item}-${index}`}>
                        {index > 0 && <span aria-hidden="true">/</span>}
                        <span>{item}</span>
                    </React.Fragment>
                ))}
            </nav>
        )}
        <div className="erp-page-header-row">
            <div className="min-w-0">
                {eyebrow && <div className="erp-page-kicker">{eyebrow}</div>}
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {(actions || meta) && (
                <div className="erp-page-header-actions">
                    {meta}
                    {actions}
                </div>
            )}
        </div>
    </header>
);

export const ActionPane = ({ children, className = '' }) => (
    <div className={`erp-action-pane ${className}`}>{children}</div>
);

export const FilterPanel = ({ children, title = 'Filtros', actions, className = '' }) => (
    <section className={`erp-filter-panel ${className}`}>
        <div className="erp-filter-panel-heading">
            <span>{title}</span>
            {actions}
        </div>
        <div className="erp-filter-panel-body">{children}</div>
    </section>
);

export const DataTable = ({ children, className = '', label = 'Tabla de datos' }) => (
    <div className={`erp-table-shell ${className}`} role="region" aria-label={label} tabIndex="0">
        {children}
    </div>
);

export const StatusBadge = ({ children, tone = 'neutral', className = '' }) => (
    <span className={`erp-status-badge erp-status-badge--${tone} ${className}`}>{children}</span>
);

export const EmptyState = ({ icon, title = 'Sin registros', description, action, className = '' }) => (
    <div className={`erp-empty-state ${className}`}>
        {icon && <div className="erp-empty-state-icon">{icon}</div>}
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {action && <div className="erp-empty-state-action">{action}</div>}
    </div>
);

export const ErrorState = ({ title = 'No se pudo cargar la informacion', description, action, className = '' }) => (
    <div className={`erp-error-state ${className}`} role="alert">
        <div>
            <strong>{title}</strong>
            {description && <p>{description}</p>}
        </div>
        {action}
    </div>
);

export const ConfirmationDialog = ({
    open,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    danger = false,
    busy = false,
    onConfirm,
    onCancel,
}) => {
    if (!open) return null;

    return (
        <div className="erp-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
            <div
                className="erp-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="erp-confirmation-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="erp-dialog-header">
                    <h2 id="erp-confirmation-title">{title}</h2>
                </div>
                <div className="erp-dialog-body">{description}</div>
                <div className="erp-dialog-actions">
                    <button type="button" className="erp-button erp-button--secondary" onClick={onCancel} disabled={busy}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`erp-button ${danger ? 'erp-button--danger' : 'erp-button--primary'}`}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? 'Procesando...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
