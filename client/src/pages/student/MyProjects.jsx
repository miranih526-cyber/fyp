import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-900 ring-yellow-600/20",
  approved: "bg-green-100 text-green-900 ring-green-600/20",
  rejected: "bg-red-100 text-red-900 ring-red-600/20",
  in_progress: "bg-blue-100 text-blue-900 ring-blue-600/20",
  completed: "bg-slate-200 text-slate-800 ring-slate-500/20",
};

function formatStatusLabel(status) {
  if (!status) return "";
  return status.replace(/_/g, " ");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyProjects() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/projects");
        if (!cancelled) {
          setProjects(data.projects || []);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message || "Failed to load projects.";
          setError(msg);
          showToast(msg, "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">My projects</h1>
          <Link
            to="/student/submit-project"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Submit project
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-600">Loading projects…</p>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-800">No projects submitted yet</p>
            <p className="mt-2 text-sm text-slate-600">Create your first project proposal to get started.</p>
            <Link
              to="/student/submit-project"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Submit a project
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {projects.map((project) => {
              const id = project._id || project.id;
              const status = project.status || "pending";
              const badgeClass = STATUS_STYLES[status] || STATUS_STYLES.pending;
              const supervisorName = project.supervisor?.name;

              return (
                <li
                  key={id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">{project.title}</h2>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${badgeClass}`}
                    >
                      {formatStatusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Supervisor:</span>{" "}
                    {supervisorName || "Not assigned"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Expected end: {formatDate(project.expectedEndDate)}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-700">{project.description}</p>
                  {status === "rejected" && project.rejectionReason ? (
                    <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <span className="font-semibold">Reason: </span>
                      {project.rejectionReason}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8">
          <Link to="/student/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
