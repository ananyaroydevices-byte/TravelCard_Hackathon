import React from 'react';

interface GlossyCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlossyCard({ children, className = '', onClick }: GlossyCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-glass overflow-hidden ${onClick ? 'cursor-pointer hover:bg-white/20 transition-colors' : ''} ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-glossy pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}
