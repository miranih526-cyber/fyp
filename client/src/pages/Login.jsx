import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export function getDashboardPath(role) {
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "supervisor":
      return "/supervisor/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/student/dashboard";
  }
}

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  const msg = data.message ?? data.error;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  return "Login failed.";
}

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const adminIntent = searchParams.get("as") === "admin";
  const sessionToast = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.sessionExpired && !sessionToast.current) {
      sessionToast.current = true;
      showToast("Session expired", "warning");
      navigate("/login", {
        replace: true,
        state: { from: location.state?.from },
      });
    }
  }, [location.state, navigate, showToast]);

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      if (adminIntent && loggedInUser.role !== "admin") {
        showToast("This account is not an administrator. You were signed in to your usual dashboard.", "info");
      }
      const from = location.state?.from;
      if (from?.pathname && typeof from.pathname === "string") {
        const path = `${from.pathname}${from.search || ""}${from.hash || ""}`;
        navigate(path, { replace: true });
      } else {
        navigate(getDashboardPath(loggedInUser.role), { replace: true });
      }
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">Sign in to FYP Management System</p>

        {adminIntent ? (
          <p className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-center text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
            Administrator sign-in: use the email and password for an <strong>admin</strong> account.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
