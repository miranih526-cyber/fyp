import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconBell,
  IconCircleCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

function readSet(uid) {
  if (!uid) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(`fyp_notifications_read_${uid}`) || "[]"));
  } catch {
    return new Set();
  }
}

function writeSet(uid, set) {
  if (!uid) return;
  localStorage.setItem(`fyp_notifications_read_${uid}`, JSON.stringify([...set]));
}

function formatRelative(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TYPE_ICON = {
  success: IconCircleCheck,
  error: IconAlertCircle,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const uid = user?.id;
  const [readIds, setReadIds] = useState(() => readSet(uid));
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const { data } = await api.get("/projects/notifications");
      setItems(data.notifications || []);
    } catch {
      setItems([]);
    }
  }, [uid]);

  useEffect(() => {
    setReadIds(readSet(uid));
  }, [uid]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = items.filter((n) => !readIds.has(n.id));
  const badge = unread.length > 9 ? "9+" : unread.length > 0 ? String(unread.length) : null;

  function markAllRead() {
    const next = new Set(readIds);
    items.forEach((n) => next.add(n.id));
    setReadIds(next);
    writeSet(uid, next);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-800"
        aria-label="Notifications"
      >
        <IconBell className="h-5 w-5" stroke={1.75} />
        {badge ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No notifications</p>
            ) : (
              items.map((n) => {
                const isUnread = !readIds.has(n.id);
                const Icon = TYPE_ICON[n.type] || IconInfoCircle;
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 border-b border-slate-50 px-3 py-2.5 last:border-0 dark:border-slate-800"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" stroke={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800 dark:text-slate-200">{n.message}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatRelative(n.createdAt)}</p>
                    </div>
                    {isUnread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
