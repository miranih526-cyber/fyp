import { Link } from "react-router-dom";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Navbar() {
  const { toggleTheme, isDark } = useTheme();
  const themeBtnLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          <span aria-hidden="true">🎓</span>
          <span className="truncate">FYP Manager</span>
        </Link>
        <nav className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={themeBtnLabel}
            title={themeBtnLabel}
          >
            <IconSun className="hidden h-5 w-5 dark:block" stroke={1.75} />
            <IconMoon className="h-5 w-5 dark:hidden" stroke={1.75} />
          </button>
          <Link
            to="/login?as=admin"
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/60"
          >
            Admin login
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
