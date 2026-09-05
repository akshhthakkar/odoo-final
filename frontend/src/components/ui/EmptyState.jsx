import React from 'react';
import './EmptyState.scss';

export default function EmptyState({
  title = 'No records found',
  hint = 'Get started by creating a new entry.',
  icon,
  action,
  actionLabel,
  onAction,
}) {
  const renderIcon = () => {
    if (!icon) {
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    }
    if (typeof icon === 'function') {
      const IconComponent = icon;
      return <IconComponent size={44} strokeWidth={1.5} />;
    }
    return icon;
  };

  return (
    <div className="ui-empty-state">
      <div className="ui-empty-state__icon">{renderIcon()}</div>
      <h3 className="ui-empty-state__title">{title}</h3>
      {hint && <p className="ui-empty-state__hint">{hint}</p>}
      {action ? (
        <div className="ui-empty-state__action">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="ui-empty-state__action">
          <button
            type="button"
            onClick={onAction}
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
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
