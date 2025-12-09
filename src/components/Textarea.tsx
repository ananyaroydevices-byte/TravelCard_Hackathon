import React from 'react';

interface TextareaProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  rows?: number;
  disabled?: boolean;
  error?: string;
}

export function Textarea({
  placeholder = '',
  value,
  onChange,
  className = '',
  rows = 4,
  disabled = false,
  error,
}: TextareaProps) {
  return (
    <div className="w-full">
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={`w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${error ? 'border-error/50 focus:border-error focus:ring-error/20' : ''} ${className}`}
      />
      {error && <p className="text-error text-sm mt-2">{error}</p>}
    </div>
  );
}
