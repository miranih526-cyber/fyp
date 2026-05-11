import { NavLink } from "react-router-dom";
import {
  IconHome,
  IconPlus,
  IconFolder,
  IconFile,
  IconCertificate,
  IconFileCheck,
  IconChartBar,
  IconUsers,
  IconUserPlus,
  IconChartLine,
  IconStack2,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext.jsx";

function navRowClass(isActive, collapsed) {
  const base = collapsed
    ? "flex items-center justify-center rounded-lg p-2.5 text-sm font-medium transition"
    : "flex items-center gap-3 rounded-lg py-2.5 px-3 text-sm font-medium transition";
  if (isActive) {
    return `${base} bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary`;
  }
  return `${base} text-slate-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-gray-800`;
}

function navIconClass(isActive) {
  return isActive
    ? "h-5 w-5 shrink-0 text-primary"
    : "h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300";
}

const studentLinks = [
  { to: "/student/dashboard", label: "Dashboard", Icon: IconHome },
  { to: "/student/submit-project", label: "Submit Project", Icon: IconPlus },
  { to: "/student/projects", label: "My Projects", Icon: IconFolder },
  { to: "/student/documents", label: "Documents", Icon: IconFile },
  { to: "/student/grades", label: "My Grades", Icon: IconCertificate },
];

const supervisorLinks = [
  { to: "/supervisor/dashboard", label: "Dashboard", Icon: IconHome },
  { to: "/supervisor/projects", label: "Assigned Projects", Icon: IconFolder },
  { to: "/supervisor/documents", label: "Review Docs", Icon: IconFileCheck },
  { to: "/supervisor/evaluate", label: "Evaluate", Icon: IconChartBar },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", Icon: IconHome },
  { to: "/admin/users", label: "Users", Icon: IconUsers },
  { to: "/admin/assign", label: "Assign Supervisors", Icon: IconUserPlus },
  { to: "/admin/projects", label: "All Projects", Icon: IconStack2 },
  { to: "/admin/reports", label: "Reports", Icon: IconChartLine },
];

/**
 * @param {object} props
 * @param {boolean} props.collapsed
 * @param {() => void} [props.onNavClick]
 * @param {() => void} props.onLogout
 * @param {() => void} [props.onToggleCollapse]
 * @param {boolean} [props.showCollapseToggle]
 */
export default function Sidebar({ collapsed, onNavClick, onLogout, onToggleCollapse, showCollapseToggle }) {
  const { user } = useAuth();
  const role = user?.role;

  let links = [];
  if (role === "student") links = studentLinks;
  else if (role === "supervisor") links = supervisorLinks;
  else if (role === "admin") links = adminLinks;

  function initials() {
    const n = (user?.name || user?.email || "?").trim();
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase() || "?";
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className={`shrink-0 border-b border-slate-100 dark:border-slate-800 ${collapsed ? "px-2 py-3" : "px-4 py-4"}`}>
        {!collapsed ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">FYP Manager</p>
            <p className="mt-1 truncate text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">{role} area</p>
          </>
        ) : (
          <p className="text-center text-lg" aria-hidden>
            🎓
          </p>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            onClick={onNavClick}
            className="block w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          >
            {({ isActive }) => (
              <span className={navRowClass(isActive, collapsed)}>
                <Icon className={navIconClass(isActive)} stroke={1.75} aria-hidden />
                {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {showCollapseToggle && onToggleCollapse ? (
        <div className="hidden shrink-0 border-t border-slate-100 px-2 py-2 dark:border-slate-800 md:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center rounded-lg border border-slate-200 py-2 text-slate-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-gray-800"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <IconChevronRight className="h-4 w-4" stroke={2} /> : <IconChevronLeft className="h-4 w-4" stroke={2} />}
          </button>
        </div>
      ) : null}

      <div className={`shrink-0 border-t border-slate-100 dark:border-slate-800 ${collapsed ? "p-2" : "p-3"}`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
              aria-hidden
            >
              {initials()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
            title={user?.name}
          >
            {initials().slice(0, 1)}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            onLogout();
            onNavClick?.();
          }}
          className={`mt-2 w-full rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${collapsed ? "px-1 py-1.5 text-xs" : "px-3 py-2"}`}
        >
          {collapsed ? "Out" : "Log out"}
        </button>
      </div>
    </div>
  );
}
