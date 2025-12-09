import React from 'react';
import { X } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function Modal({
  title,
  children,
  isOpen,
  onClose,
  primaryAction,
  secondaryAction,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-scale-in w-full max-w-md mx-4">
        <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-glass overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glossy pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors p-1"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6 text-white/80">{children}</div>

            <div className="flex gap-3">
              {secondaryAction && (
                <AnimatedButton
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="flex-1"
                >
                  {secondaryAction.label}
                </AnimatedButton>
              )}
              {primaryAction && (
                <AnimatedButton
                  variant="primary"
                  onClick={primaryAction.onClick}
                  className="flex-1"
                >
                  {primaryAction.label}
                </AnimatedButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
