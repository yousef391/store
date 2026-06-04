"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info", duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success", duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), toast.duration || 3000);
    return () => clearTimeout(timerRef.current);
  }, [toast, onRemove]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />,
    error: <AlertCircle size={18} className="text-red-400 shrink-0" />,
    info: <Info size={18} className="text-blue-400 shrink-0" />,
  };

  const borderColors = {
    success: "border-emerald-500/20",
    error: "border-red-500/20",
    info: "border-blue-500/20",
  };

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 px-4 py-3
        bg-surface border ${borderColors[toast.type]}
        rounded-xl shadow-2xl shadow-black/30
        animate-slide-in-right min-w-[280px] max-w-[400px]
      `}
      role="alert"
      aria-live="polite"
    >
      {icons[toast.type]}
      <p className="text-sm text-gray-200 flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-500 hover:text-white transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
