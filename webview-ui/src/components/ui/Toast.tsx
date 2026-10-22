import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Info } from "lucide-react";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

function SingleToast({
  toast,
  onDismiss,
  defaultDuration = 10000,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  defaultDuration?: number;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration ?? defaultDuration;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 280);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  const toneIcon: Record<ToastTone, ReactNode> = {
    info: <Info size={16} className="toast-icon info" />,
    success: <CheckCircle2 size={16} className="toast-icon success" />,
    warning: <AlertTriangle size={16} className="toast-icon warning" />,
    error: <AlertTriangle size={16} className="toast-icon error" />,
  };

  return (
    <div
      className={`toast ${toast.tone}${isExiting ? " toast-exiting" : ""}`}
      role="status"
    >
      <div className="toast-body">
        {toneIcon[toast.tone]}
        <span className="toast-text">{toast.message}</span>
        <button
          className="toast-close"
          aria-label="Dismiss notification"
          onClick={handleDismiss}
        >
          <X size={14} />
        </button>
      </div>
      <div className="toast-progress-track">
        <div
          className={`toast-progress-bar ${toast.tone}`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}

export function ToastRegion({
  toasts,
  onDismiss,
  duration = 10000,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  duration?: number;
}) {
  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map((t) => (
        <SingleToast
          key={t.id}
          toast={t}
          onDismiss={onDismiss}
          defaultDuration={duration}
        />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = "info", duration = 10000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, tone, message, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} duration={10000} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

