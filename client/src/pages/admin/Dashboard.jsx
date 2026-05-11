import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong.";
  return data.message || "Request failed.";
}

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

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, pRes] = await Promise.all([
        api.get("/users/stats"),
        api.get("/projects"),
      ]);
      setStats(sRes.data);
      setProjects(pRes.data.projects || []);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const recent = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const pending = projects.filter((p) => p.status === "pending");

  async function approveProject(id) {
    setActingId(id);
    setError("");
    try {
      await api.patch(`/projects/${id}/status`, { status: "approved" });
      await load();
      showToast("Project approved.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setActingId(null);
    }
  }

  async function submitReject() {
    if (!rejectId) return;
    const reason = rejectReason.trim();
    if (!reason) {
      const msg = "Please provide a rejection reason.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setActingId(rejectId);
    setError("");
    try {
      await api.patch(`/projects/${rejectId}/status`, {
        status: "rejected",
        rejectionReason: reason,
      });
      setRejectId(null);
      setRejectReason("");
      await load();
      showToast("Project rejected.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setActingId(null);
    }
  }

  const cards = stats
    ? [
        { label: "Total Students", value: stats.totalStudents, icon: "🎓", bg: "from-sky-500 to-blue-600" },
        { label: "Total Supervisors", value: stats.totalSupervisors, icon: "👩‍🏫", bg: "from-violet-500 to-purple-600" },
        { label: "Total Projects", value: stats.totalProjects, icon: "📁", bg: "from-emerald-500 to-teal-600" },
        { label: "Pending Projects", value: stats.pendingProjects, icon: "⏳", bg: "from-amber-500 to-orange-600" },
        { label: "Completed Projects", value: stats.completedProjects, icon: "✅", bg: "from-slate-600 to-slate-800" },
        { label: "Submissions", value: stats.totalSubmissions, icon: "📎", bg: "from-rose-500 to-pink-600" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
      </div>

      {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {loading || !stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {cards.map((c) => (
              <div
                key={c.label}
                className={`rounded-xl bg-gradient-to-br ${c.bg} p-4 text-white shadow-lg`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{c.icon}</span>
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums">{c.value}</p>
                <p className="mt-1 text-sm font-medium text-white/90">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recent projects</h2>
            <p className="text-sm text-slate-500">Last 5 by submission date</p>
            <ul className="mt-4 divide-y divide-slate-100">
              {recent.length === 0 ? (
                <li className="py-4 text-sm text-slate-600">No projects yet.</li>
              ) : (
                recent.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{p.title}</p>
                      <p className="text-xs text-slate-600">{p.student?.name || "—"}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                        STATUS_BADGE[p.status] || STATUS_BADGE.pending
                      }`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Pending approvals</h2>
            <p className="text-sm text-slate-500">Approve or reject student proposals</p>
            <ul className="mt-4 divide-y divide-slate-100">
              {pending.length === 0 ? (
                <li className="py-4 text-sm text-slate-600">No pending projects.</li>
              ) : (
                pending.map((p) => (
                  <li key={p._id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{p.title}</p>
                      <p className="text-xs text-slate-600">{p.student?.name || "—"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actingId === p._id}
                        onClick={() => approveProject(p._id)}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actingId === p._id}
                        onClick={() => {
                          setRejectId(p._id);
                          setRejectReason("");
                        }}
                        className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject project</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">Reason</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Explain why this proposal is rejected…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={!!actingId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
