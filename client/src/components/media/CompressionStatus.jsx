import React from 'react';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export function CompressionStatus({
  compressing = false,
  progress = 0,
  originalBytes = null,
  finalBytes = null,
  error = null
}) {
  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-token bg-danger/10 text-danger text-xs font-medium">
        <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (compressing) {
    return (
      <div className="space-y-1.5 p-2.5 rounded-token bg-surface-2 border border-line">
        <div className="flex justify-between text-xs text-muted">
          <span>Compressing under 500 KB ceiling...</span>
          <span className="font-mono">{progress}%</span>
        </div>
        <div className="w-full bg-line/60 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (finalBytes !== null) {
    const isUnderCeiling = finalBytes <= 512000;
    return (
      <div className="flex items-center justify-between p-2.5 rounded-token bg-surface-2 border border-line text-xs">
        <div className="flex items-center gap-1.5">
          <FiCheckCircle className={`w-4 h-4 ${isUnderCeiling ? 'text-success' : 'text-danger'}`} />
          <span className="font-medium text-main">
            {isUnderCeiling ? 'Compressed < 500 KB' : 'Ceiling Exceeded'}
          </span>
        </div>
        <div className="text-muted font-mono">
          {formatBytes(originalBytes)} → <span className="font-bold text-main">{formatBytes(finalBytes)}</span>
        </div>
      </div>
    );
  }

  return null;
}
