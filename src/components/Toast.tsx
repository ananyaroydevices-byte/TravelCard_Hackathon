import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

const iconMap = {
  success: <CheckCircle size={20} className="text-success" />,
  error: <AlertCircle size={20} className="text-error" />,
  info: <Info size={20} className="text-accent" />,
  warning: <AlertTriangle size={20} className="text-warning" />,
};

const bgColorMap = {
  success: 'bg-success/20 border-success/50',
  error: 'bg-error/20 border-error/50',
  info: 'bg-accent/20 border-accent/50',
  warning: 'bg-warning/20 border-warning/50',
};

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl ${bgColorMap[type]} shadow-glass`}>
        {iconMap[type]}
        <p className="text-white text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
