import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * @param {object} props
 * @param {string[]} [props.allowedRoles] — if provided and non-empty, user.role must be included
 */
export default function PrivateRoute({ allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent dark:border-primary"
          aria-hidden
        />
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
