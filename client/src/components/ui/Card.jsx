import React from 'react';

export function Card({ children, className = '', padding = 'p-5', ...props }) {
  return (
    <div
      className={`bg-surface border border-line rounded-token shadow-sm text-main transition-colors ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between pb-4 border-b border-line mb-4 ${className}`}>
      <div>
        <h3 className="font-semibold text-base sm:text-lg text-main tracking-tight">{title}</h3>
        {description && <p className="text-xs sm:text-sm text-muted mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
