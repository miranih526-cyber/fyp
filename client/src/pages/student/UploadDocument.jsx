import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  const msg = data.message ?? data.error;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  return "Request failed.";
}

function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const maxUploadMb = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 10;

async function downloadSubmission(id, fileName) {
  const res = await api.get(`/submissions/download/${id}`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "document";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function UploadDocument() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProjects(true);
      setError("");
      try {
        const { data } = await api.get("/projects");
        if (!cancelled) {
          const list = data.projects || [];
          setProjects(list);
          if (list.length && !projectId) {
            setProjectId(list[0]._id);
          }
        }
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
        if (!cancelled) showToast(formatApiError(err), "error");
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const loadSubmissions = useCallback(async (pid) => {
    if (!pid) {
      setSubmissions([]);
      return;
    }
    setLoadingSubmissions(true);
    try {
      const { data } = await api.get(`/submissions/project/${pid}`);
      setSubmissions(data.submissions || []);
    } catch (err) {
      setSubmissions([]);
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (projectId) loadSubmissions(projectId);
  }, [projectId, loadSubmissions]);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setError("");
    setSuccess("");
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    pickFile(f);
  }

  function handleBrowseChange(e) {
    const f = e.target.files?.[0];
    pickFile(f);
    e.target.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!projectId) {
      const msg = "Select a project.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    if (!title.trim()) {
      const msg = "Document title is required.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    if (!file) {
      const msg = "Please choose a file to upload.";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    const form = new FormData();
    form.append("projectId", projectId);
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("file", file);

    setSubmitting(true);
    setUploadProgress(0);
    try {
      await api.post("/submissions", form, {
        onUploadProgress: (ev) => {
          if (ev.total) {
            setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
          }
        },
      });
      setSuccess("Document uploaded successfully.");
      showToast("Document uploaded.", "success");
      setTitle("");
      setDescription("");
      setFile(null);
      setUploadProgress(0);
      await loadSubmissions(projectId);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProject = projects.find((p) => p._id === projectId);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Upload document</h1>
          <Link
            to="/student/dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Dashboard
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
          {loadingProjects ? (
            <p className="text-slate-600">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="text-slate-600">
              You have no projects yet.{" "}
              <Link to="/student/submit-project" className="font-medium text-blue-600 hover:underline">
                Submit a project
              </Link>{" "}
              first.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="doc-project" className="block text-sm font-medium text-slate-700">
                  Project
                </label>
                <select
                  id="doc-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="doc-title" className="block text-sm font-medium text-slate-700">
                  Document title
                </label>
                <input
                  id="doc-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g. "Chapter 1", "Final Report"'
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label htmlFor="doc-desc" className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="doc-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700">File</span>
                <label
                  htmlFor="doc-file-input"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={handleDrop}
                  className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">
                    Drag and drop a file here, or{" "}
                    <span className="text-blue-600 underline">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    PDF, DOC, DOCX, or ZIP — max {maxUploadMb}MB
                  </p>
                  <input
                    id="doc-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                    className="sr-only"
                    onChange={handleBrowseChange}
                  />
                </label>

                {file ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                    <p>
                      <span className="font-medium">Name:</span> {file.name}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Size:</span> {formatBytes(file.size)}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Type:</span> {file.type || "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : null}
              </div>

              {submitting && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
                  {success}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Uploading…" : "Upload document"}
              </button>
            </form>
          )}
        </div>

        {selectedProject && projects.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-slate-900">
              Previous submissions — {selectedProject.title}
            </h2>
            {loadingSubmissions ? (
              <p className="mt-3 text-sm text-slate-600">Loading submissions…</p>
            ) : submissions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No documents uploaded for this project yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {submissions.map((s) => {
                  const sid = s._id || s.id;
                  return (
                    <li
                      key={sid}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{s.title}</p>
                        <p className="text-xs text-slate-500">
                          v{s.version} · {formatDate(s.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadSubmission(sid, s.fileName)}
                        className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        Download
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <p className="mt-8">
          <Link to="/student/projects" className="text-sm font-medium text-blue-600 hover:underline">
            ← My projects
          </Link>
        </p>
      </div>
    </div>
  );
}
