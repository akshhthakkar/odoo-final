import React from 'react';
import './EmptyState.scss';

export default function EmptyState({
  title = 'No records found',
  hint = 'Get started by creating a new entry.',
  description,
  icon: IconProp,
  action,
  actionLabel,
  onAction,
}) {
  const renderIcon = () => {
    if (!IconProp) {
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    }
    if (React.isValidElement(IconProp)) {
      return IconProp;
    }
    if (typeof IconProp === 'function' || (typeof IconProp === 'object' && IconProp !== null)) {
      const IconComponent = IconProp;
      return <IconComponent size={44} strokeWidth={1.5} />;
    }
    return null;
  };

  // Normalize the action prop: it may be a ReactNode (rendered as-is) or an
  // object { label, onClick } (rendered as a styled button).
  const isNode = React.isValidElement(action) || action == null;
  const objectAction = !isNode && action && typeof action === 'object' ? action : null;
  const nodeAction = isNode ? action : null;

  const renderActionButton = (label, onClick) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 18px',
        borderRadius: '8px',
        background: '#2357fe',
        color: '#ffffff',
        border: 'none',
        fontSize: '13.5px',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(35, 87, 254, 0.25)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="ui-empty-state">
      <div className="ui-empty-state__icon">{renderIcon()}</div>
      <h3 className="ui-empty-state__title">{title}</h3>
      {hint && <p className="ui-empty-state__hint">{hint}</p>}
      {description && <p className="ui-empty-state__hint">{description}</p>}
      {nodeAction ? (
        <div className="ui-empty-state__action">{nodeAction}</div>
      ) : objectAction ? (
        <div className="ui-empty-state__action">
          {renderActionButton(objectAction.label, objectAction.onClick)}
        </div>
      ) : actionLabel && onAction ? (
        <div className="ui-empty-state__action">
          {renderActionButton(actionLabel, onAction)}
        </div>
      ) : null}
    </div>
  );
}
