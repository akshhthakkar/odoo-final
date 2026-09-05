import React from 'react';
import './EmptyState.scss';

export default function EmptyState({
  title = 'No records found',
  hint = 'Get started by creating a new entry.',
  icon,
  action,
}) {
  return (
    <div className="ui-empty-state">
      <div className="ui-empty-state__icon">
        {icon || (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        )}
      </div>
      <h3 className="ui-empty-state__title">{title}</h3>
      {hint && <p className="ui-empty-state__hint">{hint}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
}
