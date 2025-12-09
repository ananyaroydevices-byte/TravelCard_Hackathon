import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  error,
}: SelectProps) {
  return (
    <div className="w-full relative">
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${error ? 'border-error/50 focus:border-error focus:ring-error/20' : ''} ${className}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-900">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 pointer-events-none" size={20} />
      </div>
      {error && <p className="text-error text-sm mt-2">{error}</p>}
    </div>
  );
}
