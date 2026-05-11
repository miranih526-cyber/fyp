import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 3000) => {
      const id = ++toastId;
      const item = { id, message: String(message), type, duration };
      setToasts((prev) => {
        const next = [...prev, item];
        if (next.length > 3) return next.slice(-3);
        return next;
      });
    },
    []
  );

  const value = useMemo(() => ({ showToast, toasts, removeToast }), [showToast, toasts, removeToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
