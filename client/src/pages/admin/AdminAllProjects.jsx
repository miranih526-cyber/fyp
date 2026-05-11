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

export default function AdminAllProjects() {
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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">All projects</h1>
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Student</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Supervisor</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                    Loading…
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                    No projects yet.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3 text-slate-900">{p.student?.name || "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                    <td className="px-4 py-3 text-slate-700">{p.supervisor?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                          STATUS_BADGE[p.status] || STATUS_BADGE.pending
                        }`}
                      >
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
