import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'lg' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full ${widthClass} bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl shadow-2xl overflow-hidden animate-scaleUp`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-industrial-100 dark:border-industrial-800">
          <h3 className="text-base font-bold text-industrial-900 dark:text-industrial-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-industrial-400 hover:text-industrial-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
