import React from 'react';
import { FiInbox } from 'react-icons/fi';

export function EmptyState({
  icon: Icon = FiInbox,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  action = null,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-token border border-dashed border-line bg-surface/50 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-muted mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-main">{title}</h3>
      <p className="text-xs sm:text-sm text-muted max-w-sm mt-1 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
