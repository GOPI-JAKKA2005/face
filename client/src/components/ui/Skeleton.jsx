import React from 'react';

export function Skeleton({ className = '', variant = 'rectangular' }) {
  const variantStyles = {
    circular: 'rounded-full',
    rectangular: 'rounded-token',
    text: 'rounded h-4'
  };

  return (
    <div
      className={`animate-pulse bg-surface-2 ${variantStyles[variant] || variantStyles.rectangular} ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-5 border border-line rounded-token bg-surface space-y-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
