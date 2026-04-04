'use client';

import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ChatToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ChatToast({ toasts, onRemove }: ChatToastProps) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastBubble key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastBubble({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  const colors = {
    success: { bg: '#10b98120', border: '#10b98140', text: '#10b981', icon: '✓' },
    error:   { bg: '#f43f5e20', border: '#f43f5e40', text: '#f43f5e', icon: '✕' },
    info:    { bg: '#00f5d420', border: '#00f5d440', text: '#00f5d4', icon: 'ℹ' },
  }[toast.type];

  return (
    <div
      className="pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-medium backdrop-blur-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
    >
      <span className="text-[15px] leading-none">{colors.icon}</span>
      <span>{toast.message}</span>
    </div>
  );
}

/** Hook to manage toasts */
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
