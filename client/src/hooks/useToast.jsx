import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000, onUndo = null }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type, onUndo }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    info: (message, title, onUndo) => addToast({ message, title, type: 'info', onUndo }),
    success: (message, title, onUndo) => addToast({ message, title, type: 'success', onUndo }),
    warning: (message, title, onUndo) => addToast({ message, title, type: 'warning', onUndo }),
    error: (message, title, onUndo) => addToast({ message, title, type: 'danger', duration: 6000, onUndo }),
    dismiss: removeToast
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
