import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Info } from "lucide-react";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastRegion({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  const toneIcon: Record<ToastTone, ReactNode> = {
    info: <Info size={14} style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }} />,
    success: <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }} />,
    warning: <AlertTriangle size={14} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />,
    error: <AlertTriangle size={14} style={{ color: "var(--error)", flexShrink: 0, marginTop: 1 }} />,
  };

  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {toneIcon[t.tone]}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button className="toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(t.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
