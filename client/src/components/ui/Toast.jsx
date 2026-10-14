import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiInfo, FiX, FiRotateCcw } from 'react-icons/fi';
import { useToast } from '../../hooks/useToast.js';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const iconMap = {
    success: <FiCheckCircle className="w-5 h-5 text-success flex-shrink-0" />,
    warning: <FiAlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />,
    danger: <FiAlertCircle className="w-5 h-5 text-danger flex-shrink-0" />,
    info: <FiInfo className="w-5 h-5 text-primary flex-shrink-0" />
  };

  return (
    <aside
      aria-label="Notifications"
      className="fixed z-50 pointer-events-none inset-x-0 top-3 px-4 flex flex-col items-center gap-2 sm:inset-x-auto sm:top-auto sm:bottom-4 sm:right-4 sm:items-end"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-center justify-between gap-3 w-full max-w-sm p-3.5 bg-surface border border-line rounded-token shadow-lg text-main"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {iconMap[toast.type] || iconMap.info}
              <div className="flex-1 min-w-0">
                {toast.title && <p className="text-xs font-semibold uppercase tracking-wider">{toast.title}</p>}
                <p className="text-sm font-medium text-main break-words">{toast.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo();
                    removeToast(toast.id);
                  }}
                  className="px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded flex items-center gap-1 transition-colors"
                >
                  <FiRotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="p-1 text-muted hover:text-main rounded hover:bg-surface-2 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </aside>
  );
}
