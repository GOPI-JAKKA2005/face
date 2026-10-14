import React from 'react';

export const Select = React.forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    className = '',
    id,
    children,
    ...props
  },
  ref
) {
  const selectId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-main uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`block w-full rounded-token border bg-surface text-main text-sm transition-all px-3.5 py-2 min-h-[40px]
          ${error ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' : 'border-line focus:border-primary focus:ring-1 focus:ring-primary'}
          disabled:bg-surface-2 disabled:text-muted disabled:cursor-not-allowed
          ${className}`}
        {...props}
      >
        {options.length > 0
          ? options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-muted">{helperText}</p>}
    </div>
  );
});
