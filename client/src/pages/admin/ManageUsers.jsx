import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong.";
  return data.message || "Request failed.";
}

const ROLE_BADGE = {
  admin: "bg-purple-100 text-purple-900 ring-purple-600/20",
  supervisor: "bg-blue-100 text-blue-900 ring-blue-600/20",
  student: "bg-slate-100 text-slate-900 ring-slate-500/20",
};

function SkeletonRows({ count = 10 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i}>
          <td colSpan={6} className="px-4 py-3">
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function ManageUsers() {
  const { showToast } = useToast();
  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteUser, setDeleteUser] = useState(null);
  const [roleDraft, setRoleDraft] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, roleFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 10 };
      if (roleFilter !== "all") params.role = roleFilter;
      if (debouncedQ) params.q = debouncedQ;
      const { data } = await api.get("/users", { params });
      setUsers(data.users || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, debouncedQ, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const roleOptions = useMemo(
    () => [
      { value: "all", label: "All roles" },
      { value: "student", label: "Student" },
      { value: "supervisor", label: "Supervisor" },
      { value: "admin", label: "Admin" },
    ],
    []
  );

  async function applyRole(userId, role) {
    setError("");
    try {
      await api.patch(`/users/${userId}/role`, { role });
      setRoleDraft((d) => ({ ...d, [userId]: undefined }));
      await fetchUsers();
      showToast("Role updated.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    }
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    setError("");
    try {
      await api.delete(`/users/${deleteUser._id}`);
      setDeleteUser(null);
      await fetchUsers();
      showToast("User deleted.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Manage users</h1>
          <Link to="/admin/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
            ← Admin dashboard
          </Link>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label htmlFor="user-search" className="block text-sm font-medium text-slate-700">
              Search (name or email)
            </label>
            <input
              id="user-search"
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Type to search…"
              className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Roll no.</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Department</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <SkeletonRows />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                            ROLE_BADGE[u.role] || ROLE_BADGE.student
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.rollNo || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{u.department || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={roleDraft[u._id] ?? u.role}
                            onChange={(e) =>
                              setRoleDraft((d) => ({ ...d, [u._id]: e.target.value }))
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                          >
                            <option value="student">student</option>
                            <option value="supervisor">supervisor</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => applyRole(u._id, roleDraft[u._id] ?? u.role)}
                            className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Save role
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteUser(u)}
                            className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
              Page {page} of {pages} · {total} users
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete user?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete <strong>{deleteUser.name}</strong> and cascade delete their projects and
              submissions. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
