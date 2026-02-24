'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, type ToastType } from '@/lib/store/toast';

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
  success: { icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
  error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
};

function ToastItem({ id, type, message }: { id: string; type: ToastType; message: string }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const cfg = toastConfig[type];
  const Icon = cfg.icon;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => removeToast(id), 200);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border shadow-lg transition-all duration-200 ${cfg.bg} ${cfg.border} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <Icon size={18} className={cfg.text} />
      <p className={`text-sm font-medium flex-1 ${cfg.text}`}>{message}</p>
      <button
        onClick={handleClose}
        className="p-1 rounded hover:bg-black/5 transition-colors"
      >
        <X size={14} className={cfg.text} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} type={t.type} message={t.message} />
      ))}
    </div>
  );
}
