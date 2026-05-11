import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong.";
  return data.message || "Request failed.";
}

function hasSupervisor(p) {
  return Boolean(p.supervisor && (p.supervisor._id || p.supervisor));
}

function isPendingOrApproved(p) {
  return p.status === "pending" || p.status === "approved";
}

export default function AssignSupervisor() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalProject, setModalProject] = useState(null);
  const [supSearch, setSupSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, sRes] = await Promise.all([
        api.get("/projects"),
        api.get("/users", { params: { role: "supervisor", limit: 100, page: 1 } }),
      ]);
      setProjects(pRes.data.projects || []);
      setSupervisors(sRes.data.users || []);
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

  const supervisorCounts = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const sid = p.supervisor?._id != null ? String(p.supervisor._id) : p.supervisor ? String(p.supervisor) : null;
      if (!sid) return;
      map.set(sid, (map.get(sid) || 0) + 1);
    });
    return map;
  }, [projects]);

  const { unassigned, assigned } = useMemo(() => {
    const pool = projects.filter((p) => isPendingOrApproved(p));
    return {
      unassigned: pool.filter((p) => !hasSupervisor(p)),
      assigned: pool.filter((p) => hasSupervisor(p)),
    };
  }, [projects]);

  const filteredSupervisors = useMemo(() => {
    const q = supSearch.trim().toLowerCase();
    if (!q) return supervisors;
    return supervisors.filter(
      (s) =>
        String(s.name || "")
          .toLowerCase()
          .includes(q) ||
        String(s.email || "")
          .toLowerCase()
          .includes(q)
    );
  }, [supervisors, supSearch]);

  async function assign(projectId, supervisorId) {
    setAssigning(true);
    setError("");
    try {
      await api.patch(`/projects/${projectId}/assign`, { supervisorId });
      setModalProject(null);
      setSupSearch("");
      await load();
      showToast("Supervisor assigned.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setAssigning(false);
    }
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Assign supervisor</h1>
          <Link to="/admin/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
            ← Admin dashboard
          </Link>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-slate-600">Loading…</p>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900">Needs assignment</h2>
              <p className="text-sm text-slate-600">Projects that are pending or approved and have no supervisor yet.</p>
              <div className="mt-4 space-y-4">
                {unassigned.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
                    No projects waiting for a supervisor.
                  </p>
                ) : (
                  unassigned.map((p) => (
                    <article
                      key={p._id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {p.student?.name || "Student"}
                          </p>
                          <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                          <p className="mt-2 text-xs text-slate-500">Submitted: {formatDate(p.createdAt)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setModalProject(p);
                            setSupSearch("");
                          }}
                          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                          Assign supervisor
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">Assigned</h2>
              <p className="text-sm text-slate-600">Pending or approved projects that already have a supervisor.</p>
              <div className="mt-4 space-y-3">
                {assigned.length === 0 ? (
                  <p className="text-sm text-slate-600">None yet.</p>
                ) : (
                  assigned.map((p) => (
                    <div
                      key={p._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-900">{p.title}</span>
                        <span className="text-slate-500"> · {p.student?.name}</span>
                      </div>
                      <span className="text-slate-700">
                        Supervisor: <strong>{p.supervisor?.name || "—"}</strong>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

      {modalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Choose supervisor</h3>
            <p className="mt-1 text-sm text-slate-600">
              Project: <strong>{modalProject.title}</strong>
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">Search supervisors</label>
            <input
              type="search"
              value={supSearch}
              onChange={(e) => setSupSearch(e.target.value)}
              placeholder="Filter by name…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {filteredSupervisors.map((s) => {
                const count = supervisorCounts.get(String(s._id)) ?? 0;
                return (
                  <li key={s._id}>
                    <button
                      type="button"
                      disabled={assigning}
                      onClick={() => assign(modalProject._id, s._id)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <span>
                        <span className="font-medium text-slate-900">{s.name}</span>
                        <span className="block text-xs text-slate-500">{s.email}</span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {count} project{count === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filteredSupervisors.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No supervisors match your search.</p>
            ) : null}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setModalProject(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
