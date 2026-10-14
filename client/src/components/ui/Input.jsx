import React from 'react';

export const Input = React.forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    className = '',
    id,
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-main uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-token">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`block w-full rounded-token border bg-surface text-main placeholder-muted text-sm transition-all
            ${Icon ? 'pl-9' : 'pl-3.5'} pr-3.5 py-2 min-h-[40px]
            ${error ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' : 'border-line focus:border-primary focus:ring-1 focus:ring-primary'}
            disabled:bg-surface-2 disabled:text-muted disabled:cursor-not-allowed
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-muted">{helperText}</p>}
    </div>
  );
});
