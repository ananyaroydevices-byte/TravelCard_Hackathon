import React from 'react';

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function Input({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  className = '',
  disabled = false,
  error,
}: InputProps) {
  return (
    <div className="w-full">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-error/50 focus:border-error focus:ring-error/20' : ''} ${className}`}
      />
      {error && <p className="text-error text-sm mt-2">{error}</p>}
    </div>
  );
}
