import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconFileText, IconCertificate, IconPlus } from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/axios.js";

function statusLabel(s) {
  if (!s) return "—";
  return String(s).replace(/_/g, " ");
}

export default function StudentHome() {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/projects");
      const list = data.projects || [];
      setProject(list[0] || null);
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Welcome back, {user?.name || "student"}
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">Here is a quick overview of your FYP workspace.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          to="/student/submit-project"
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary/50"
        >
          <IconPlus className="h-8 w-8 text-primary" stroke={1.5} aria-hidden />
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-primary">Submit</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Submit project</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Send your proposal for approval.</p>
        </Link>
        <Link
          to="/student/documents"
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary/50"
        >
          <IconFileText className="h-8 w-8 text-primary" stroke={1.5} aria-hidden />
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-primary">Upload</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">View docs</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Upload and track documents.</p>
        </Link>
        <Link
          to="/student/grades"
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary/50"
        >
          <IconCertificate className="h-8 w-8 text-primary" stroke={1.5} aria-hidden />
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-primary">Results</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Check grades</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">See evaluation and breakdown.</p>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Project status</h2>
        {loading ? (
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading…</p>
        ) : !project ? (
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            No project yet.{" "}
            <Link to="/student/submit-project" className="font-medium text-primary hover:underline">
              Submit your first project
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{project.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 capitalize">{statusLabel(project.status)}</p>
            </div>
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary ring-1 ring-primary/20">
              {statusLabel(project.status)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
