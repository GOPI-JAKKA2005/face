import React from 'react';

export function CaptureProgress({ current = 0, total = 8, message = '' }) {
  const percentage = Math.min(100, Math.round((current / total) * 100));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-3 p-3 bg-surface border border-line rounded-token">
      <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 76 76">
          <circle
            cx="38"
            cy="38"
            r={radius}
            className="text-surface-2 stroke-current"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="38"
            cy="38"
            r={radius}
            className="text-primary stroke-current transition-all duration-300 ease-out"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-xs font-bold text-main">{current}</span>
          <span className="text-[10px] text-muted">/{total}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-main uppercase tracking-wider">
          Biometric Sampling
        </h4>
        <p className="text-xs text-muted mt-0.5 truncate">
          {message || (current < 5 ? 'Keep looking straight ahead' : 'Turn head slightly')}
        </p>
      </div>
    </div>
  );
}
