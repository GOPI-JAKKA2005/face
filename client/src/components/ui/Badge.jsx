import React from 'react';

export function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const variantStyles = {
    default: 'bg-surface-2 text-main border border-line',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-success/15 text-success border border-success/30 font-medium',
    warning: 'bg-warning/15 text-warning border border-warning/30 font-medium',
    danger: 'bg-danger/15 text-danger border border-danger/30 font-medium',
    accent: 'bg-accent/15 text-accent border border-accent/30 font-medium'
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-token'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold tracking-wide ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {children}
    </span>
  );
}
