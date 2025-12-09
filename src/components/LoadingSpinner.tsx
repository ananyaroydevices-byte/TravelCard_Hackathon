import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClass} border-4 border-white/20 border-t-primary rounded-full animate-spin`} />
      {text && <p className="text-white/70 text-sm">{text}</p>}
    </div>
  );
}
