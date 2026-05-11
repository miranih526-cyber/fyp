import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

const STATUS_BADGE = {
  pending: "bg-yellow-100 text-yellow-900 ring-yellow-600/20",
  approved: "bg-green-100 text-green-900 ring-green-600/20",
  rejected: "bg-red-100 text-red-900 ring-red-600/20",
  in_progress: "bg-blue-100 text-blue-900 ring-blue-600/20",
  completed: "bg-slate-200 text-slate-800 ring-slate-500/20",
};

function statusLabel(s) {
  return (s || "").replace(/_/g, " ");
}

export default function SupervisorProjects() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/projects");
      setProjects(data.projects || []);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load projects.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Assigned projects</h1>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-600">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            You have no assigned projects yet.
          </p>
        ) : (
          projects.map((p) => (
            <article key={p._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">{p.student?.name || "Student"}</p>
                  <h2 className="text-lg font-semibold text-slate-900">{p.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                    STATUS_BADGE[p.status] || STATUS_BADGE.pending
                  }`}
                >
                  {statusLabel(p.status)}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
