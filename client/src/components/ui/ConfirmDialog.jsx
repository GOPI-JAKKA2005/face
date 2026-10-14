import React from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { FiAlertTriangle } from 'react-icons/fi';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true,
  loading = false,
  requireMatch = null, // e.g. "DELETE"
  matchValue = '',
  onMatchChange = () => {}
}) {
  const isConfirmDisabled = requireMatch ? matchValue !== requireMatch : false;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-2.5 rounded-full ${danger ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'} flex-shrink-0`}>
          <FiAlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-main">{title}</h3>
          <p className="text-sm text-muted mt-1">{message}</p>
        </div>
      </div>

      {requireMatch && (
        <div className="my-4">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Type <span className="text-danger font-mono font-bold">{requireMatch}</span> to confirm:
          </label>
          <input
            type="text"
            value={matchValue}
            onChange={(e) => onMatchChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-line rounded-token bg-surface text-main focus:outline-none focus:ring-1 focus:ring-danger"
            placeholder={requireMatch}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line mt-4">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          disabled={isConfirmDisabled}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
