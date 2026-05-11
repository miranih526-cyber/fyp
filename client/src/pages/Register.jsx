import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  const msg = data.message ?? data.error;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  return "Request failed.";
}

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    if (password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    if (role === "student" && !rollNo.trim()) {
      const msg = "Roll number is required for students.";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: fullName.trim(),
        email: email.trim(),
        password,
        role,
        rollNo: role === "student" ? rollNo.trim() : "",
      };
      await register(payload);
      showToast("Account created. Redirecting…", "success");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-1 text-center text-sm text-slate-600">FYP Management System</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="reg-full-name" className="block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="reg-full-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label htmlFor="reg-role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== "student") setRollNo("");
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="student">Student</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>

          {role === "student" && (
            <div>
              <label htmlFor="reg-roll" className="block text-sm font-medium text-slate-700">
                Roll no.
              </label>
              <input
                id="reg-roll"
                type="text"
                autoComplete="off"
                required={role === "student"}
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Register"}
          </button>
        </form>

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
