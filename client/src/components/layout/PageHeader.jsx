import React from 'react';

export function PageHeader({ title, description, actions = null, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 ${className}`}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-main font-poppins">{title}</h2>
        {description && <p className="text-xs sm:text-sm text-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}
