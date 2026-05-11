import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function ReviewDocuments() {
  const { showToast } = useToast();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openFeedbackId, setOpenFeedbackId] = useState(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [savingId, setSavingId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: projRes } = await api.get("/projects");
      const projects = projRes.projects || [];
      const nextSections = await Promise.all(
        projects.map(async (p) => {
          try {
            const { data } = await api.get(`/submissions/project/${p._id}`);
            return {
              projectId: p._id,
              projectTitle: p.title,
              submissions: data.submissions || [],
            };
          } catch {
            return {
              projectId: p._id,
              projectTitle: p.title,
              submissions: [],
            };
          }
        })
      );
      setSections(nextSections);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const orderedSections = useMemo(() => {
    return [...sections].sort((a, b) =>
      String(a.projectTitle).localeCompare(String(b.projectTitle))
    );
  }, [sections]);

  function openFeedback(submission) {
    setOpenFeedbackId(submission._id || submission.id);
    setFeedbackDraft(submission.feedback || "");
  }

  function closeFeedback() {
    setOpenFeedbackId(null);
    setFeedbackDraft("");
  }

  async function saveFeedback(submissionId) {
    const trimmed = feedbackDraft.trim();
    if (!trimmed) {
      const msg = "Please enter feedback before saving.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setSavingId(submissionId);
    setError("");
    try {
      const { data } = await api.patch(`/submissions/${submissionId}/feedback`, {
        feedback: trimmed,
      });
      const updated = data.submission;
      setSections((prev) =>
        prev.map((sec) => ({
          ...sec,
          submissions: sec.submissions.map((s) =>
            (s._id || s.id) === submissionId ? { ...s, ...updated } : s
          ),
        }))
      );
      closeFeedback();
      showToast("Feedback saved.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Review documents</h1>
          <Link
            to="/supervisor/dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-600">Loading…</p>
        ) : error && sections.length === 0 ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : orderedSections.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            No assigned projects found.
          </div>
        ) : (
          <div className="space-y-10">
            {error ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {error}
              </p>
            ) : null}

            {orderedSections.map((sec) => (
              <section key={sec.projectId} className="rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h2 className="text-lg font-semibold text-slate-900">{sec.projectTitle}</h2>
                  <p className="text-xs text-slate-500">Project ID: {sec.projectId}</p>
                </div>

                {sec.submissions.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-600">No submissions for this project yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {sec.submissions.map((s) => {
                      const sid = s._id || s.id;
                      const student = s.student;
                      const studentName = student?.name || "Student";
                      const reviewed = Boolean(s.supervisorReviewed);
                      const isOpen = openFeedbackId === sid;

                      return (
                        <li key={sid} className="px-4 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-slate-900">{s.title}</p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  v{s.version}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                    reviewed
                                      ? "bg-green-100 text-green-900 ring-green-600/20"
                                      : "bg-yellow-100 text-yellow-900 ring-yellow-600/20"
                                  }`}
                                >
                                  {reviewed ? "Reviewed" : "Pending Review"}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">
                                <span className="font-medium text-slate-700">Student:</span> {studentName}
                                {student?.rollNo ? ` (${student.rollNo})` : ""}
                              </p>
                              <p className="text-xs text-slate-500">{formatDate(s.createdAt)}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => downloadSubmission(sid, s.fileName)}
                                className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                onClick={() => (isOpen ? closeFeedback() : openFeedback(s))}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                              >
                                {isOpen ? "Cancel" : "Give feedback"}
                              </button>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <label htmlFor={`fb-${sid}`} className="block text-sm font-medium text-slate-700">
                                Feedback
                              </label>
                              <textarea
                                id={`fb-${sid}`}
                                rows={4}
                                value={feedbackDraft}
                                onChange={(e) => setFeedbackDraft(e.target.value)}
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                                placeholder="Write your feedback for the student…"
                              />
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={savingId === sid}
                                  onClick={() => saveFeedback(sid)}
                                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {savingId === sid ? "Saving…" : "Save feedback"}
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        <p className="mt-8">
          <button
            type="button"
            onClick={() => loadAll()}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </p>
      </div>
    </div>
  );
}
