import { useEffect } from "react";
import { useToast } from "../context/ToastContext.jsx";
import {
  IconCircleCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";

const STYLES = {
  success:
    "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/80 dark:text-green-100",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/80 dark:text-blue-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100",
};

const ICONS = {
  success: IconCircleCheck,
  error: IconAlertCircle,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
};

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onDismiss]);

  const Icon = ICONS[toast.type] || ICONS.info;
  const barClass =
    toast.type === "success"
      ? "bg-green-500"
      : toast.type === "error"
        ? "bg-red-500"
        : toast.type === "warning"
          ? "bg-amber-500"
          : "bg-blue-500";

  return (
    <div
      className={`pointer-events-auto flex max-w-md animate-[toast-slide-in_0.28s_ease-out] flex-col overflow-hidden rounded-lg border shadow-lg ${STYLES[toast.type] || STYLES.info}`}
      role="status"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-90" stroke={1.75} aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded p-0.5 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="h-1 w-full bg-black/10 dark:bg-white/10">
        <div
          className={`h-full origin-left ${barClass}`}
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export default function Toast() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:max-w-md"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}
