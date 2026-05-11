import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { IconMenu2, IconSun, IconMoon } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import NotificationBell from "../components/NotificationBell.jsx";

const PAGE_TITLES = [
  ["/student/dashboard", "Dashboard"],
  ["/student/submit-project", "Submit project"],
  ["/student/projects", "My projects"],
  ["/student/documents", "Documents"],
  ["/student/grades", "My grades"],
  ["/supervisor/dashboard", "Dashboard"],
  ["/supervisor/projects", "Assigned projects"],
  ["/supervisor/documents", "Review documents"],
  ["/supervisor/evaluate", "Evaluate"],
  ["/admin/dashboard", "Dashboard"],
  ["/admin/users", "Users"],
  ["/admin/assign", "Assign supervisors"],
  ["/admin/projects", "All projects"],
  ["/admin/reports", "Reports"],
];

function pageTitle(pathname) {
  const hit = PAGE_TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : "Dashboard";
}

function initials(name, email) {
  const n = (name || email || "?").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase() || "?";
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("fyp_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [isMdUp, setIsMdUp] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );

  const title = useMemo(() => pageTitle(location.pathname), [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const fn = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("fyp_sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const sidebarCollapsedVisual = isMdUp && collapsed;
  const sidebarWidthClass = sidebarCollapsedVisual ? "w-16" : "w-[240px]";
  const mainPad = isMdUp ? (sidebarCollapsedVisual ? "md:pl-16" : "md:pl-[240px]") : "";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
    setSidebarOpen(false);
  }

  const themeBtnLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div
      className={`min-h-screen bg-slate-100 text-slate-900 transition-[padding] duration-200 dark:bg-slate-950 dark:text-slate-100 ${mainPad}`}
    >
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 shadow-lg transition-transform duration-200 md:translate-x-0 ${sidebarWidthClass} ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          collapsed={sidebarCollapsedVisual}
          onNavClick={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          onToggleCollapse={toggleCollapse}
          showCollapseToggle={isMdUp}
        />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-4">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-gray-800 md:hidden"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <IconMenu2 className="h-5 w-5" stroke={1.75} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <NotificationBell />
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-800"
            aria-label={themeBtnLabel}
            title={themeBtnLabel}
          >
            <IconSun className="hidden h-5 w-5 dark:block" stroke={1.75} />
            <IconMoon className="h-5 w-5 dark:hidden" stroke={1.75} />
          </button>
          <div
            className="hidden h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary sm:flex"
            title={user?.name ? `${user.name} — ${user.email || ""}` : user?.email || "Account"}
            aria-label={user?.name ? `Signed in as ${user.name}` : "Account"}
            role="img"
          >
            {initials(user?.name, user?.email)}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
