import React from 'react';
import './Toast.scss';

export default function Toast({ id, message, type = 'info', onDismiss }) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div className={`ui-toast ui-toast--${type}`} role="status" aria-live="polite">
      <span className="ui-toast__icon">{getIcon()}</span>
      <span className="ui-toast__message">{message}</span>
      <button className="ui-toast__close" onClick={() => onDismiss(id)} aria-label="Dismiss notification">
        &times;
      </button>
    </div>
  );
}
