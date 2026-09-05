import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from './Toast.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', { autoCloseMs = 3500 } = {}) => {
      const id = Date.now() + Math.random().toString(36).slice(2, 6);
      const newToast = { id, message, type };

      setToasts((prev) => [...prev, newToast]);

      if (autoCloseMs > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, autoCloseMs);
      }
      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="ui-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg, type) => console.log(`[Toast ${type || 'info'}]: ${msg}`),
      dismissToast: () => {},
    };
  }
  return context;
}
