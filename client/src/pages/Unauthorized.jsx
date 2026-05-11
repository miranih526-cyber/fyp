import { Link, useNavigate } from "react-router-dom";
import { IconLock } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboardPath } from "./Login.jsx";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const myDashboard =
    isAuthenticated && user?.role ? getDashboardPath(user.role) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
        <IconLock className="h-8 w-8 text-amber-600 dark:text-amber-400" stroke={1.75} aria-hidden />
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Access denied</h1>
      <p className="mt-3 max-w-md text-center text-slate-600 dark:text-slate-400">
        Your account role ({user?.role || "guest"}) cannot open this area. Students, supervisors, and admins each have
        their own sections—use the dashboard that matches how you signed up.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Go back
        </button>
        {myDashboard ? (
          <Link
            to={myDashboard}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            My dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Log in
          </Link>
        )}
        <Link
          to="/"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Site home
        </Link>
      </div>
    </div>
  );
}
