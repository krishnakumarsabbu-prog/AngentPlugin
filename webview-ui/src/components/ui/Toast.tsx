import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Info } from "lucide-react";

type ToastTone = "info" | "success" | "warning" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    counter += 1;
    const id = counter;
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const toneIcon: Record<ToastTone, ReactNode> = {
    info: <Info size={14} style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }} />,
    success: <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }} />,
    warning: <AlertTriangle size={14} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />,
    error: <AlertTriangle size={14} style={{ color: "var(--error)", flexShrink: 0, marginTop: 1 }} />,
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {toneIcon[t.tone]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="toast-close" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
