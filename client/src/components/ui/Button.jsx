import React from 'react';

export const Button = React.forwardRef(function Button(
  {
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    onClick,
    ...props
  },
  ref
) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all rounded-token focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2 gap-2 min-h-[40px]',
    lg: 'text-base px-5 py-2.5 gap-2.5 min-h-[48px]'
  };

  const variantStyles = {
    primary: 'bg-primary text-primary-contrast hover:opacity-90 shadow-sm focus-visible:outline-primary',
    secondary: 'bg-surface-2 text-main hover:bg-line/60 focus-visible:outline-primary',
    outline: 'border border-line bg-surface text-main hover:bg-surface-2 focus-visible:outline-primary',
    danger: 'bg-danger text-white hover:opacity-90 focus-visible:outline-danger shadow-sm',
    ghost: 'text-main hover:bg-surface-2 focus-visible:outline-primary',
    accent: 'bg-accent text-white hover:opacity-90 focus-visible:outline-accent shadow-sm'
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
