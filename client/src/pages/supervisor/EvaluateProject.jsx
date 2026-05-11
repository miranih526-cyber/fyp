import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

const DEFAULT_MARKS = {
  proposal: 0,
  implementation: 0,
  documentation: 0,
  presentation: 0,
};

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  const msg = data.message ?? data.error;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  return "Request failed.";
}

function computeGrade(total) {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B+";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  return "F";
}

function gradeBadgeClass(grade) {
  switch (grade) {
    case "A+":
      return "bg-emerald-600 text-white ring-emerald-700/30";
    case "A":
      return "bg-green-600 text-white ring-green-700/30";
    case "B+":
      return "bg-lime-500 text-slate-900 ring-lime-700/30";
    case "B":
      return "bg-amber-400 text-slate-900 ring-amber-600/30";
    case "C":
      return "bg-orange-500 text-white ring-orange-700/30";
    default:
      return "bg-red-600 text-white ring-red-800/30";
  }
}

export default function EvaluateProject() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [marks, setMarks] = useState({ ...DEFAULT_MARKS });
  const [overallFeedback, setOverallFeedback] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [evaluationId, setEvaluationId] = useState(null);
  const [finalized, setFinalized] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  const eligibleProjects = useMemo(() => {
    return (projects || []).filter((p) =>
      ["in_progress", "approved"].includes(p.status)
    );
  }, [projects]);

  const total = useMemo(() => {
    return (
      Number(marks.proposal || 0) +
      Number(marks.implementation || 0) +
      Number(marks.documentation || 0) +
      Number(marks.presentation || 0)
    );
  }, [marks]);

  const previewGrade = useMemo(() => computeGrade(total), [total]);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError("");
    try {
      const { data } = await api.get("/projects");
      setProjects(data.projects || []);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoadingProjects(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadEvaluation = useCallback(async (pid) => {
    if (!pid) return;
    setLoadingEval(true);
    setError("");
    try {
      const { data } = await api.get(`/evaluations/project/${pid}`);
      const ev = data.evaluation;
      if (ev) {
        setEvaluationId(ev._id);
        setFinalized(Boolean(ev.isFinalized));
        setMarks({
          proposal: Number(ev.marks?.proposal ?? 0),
          implementation: Number(ev.marks?.implementation ?? 0),
          documentation: Number(ev.marks?.documentation ?? 0),
          presentation: Number(ev.marks?.presentation ?? 0),
        });
        setOverallFeedback(ev.overallFeedback || "");
        setStrengths(ev.strengths || "");
        setImprovements(ev.improvements || "");
      } else {
        setEvaluationId(null);
        setFinalized(false);
        setMarks({ ...DEFAULT_MARKS });
        setOverallFeedback("");
        setStrengths("");
        setImprovements("");
      }
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoadingEval(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!projectId) return;
    loadEvaluation(projectId);
  }, [projectId, loadEvaluation]);

  useEffect(() => {
    if (!loadingProjects && eligibleProjects.length && !projectId) {
      setProjectId(eligibleProjects[0]._id);
    }
  }, [loadingProjects, eligibleProjects, projectId]);

  function updateMark(key, value) {
    const n = Math.min(25, Math.max(0, Number(value)));
    setMarks((prev) => ({ ...prev, [key]: n }));
  }

  async function saveDraft() {
    if (!projectId) {
      const msg = "Select a project.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    const fb = overallFeedback.trim();
    if (!fb) {
      const msg = "Overall feedback is required.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/evaluations", {
        projectId,
        marks,
        overallFeedback: fb,
        strengths,
        improvements,
      });
      setEvaluationId(data.evaluation?._id || null);
      showToast("Draft saved.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function finalizeSubmit() {
    if (!projectId) {
      const msg = "Select a project.";
      setError(msg);
      showToast(msg, "error");
      setShowFinalizeModal(false);
      return;
    }
    const fb = overallFeedback.trim();
    if (!fb) {
      const msg = "Overall feedback is required.";
      setError(msg);
      showToast(msg, "error");
      setShowFinalizeModal(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const postRes = await api.post("/evaluations", {
        projectId,
        marks,
        overallFeedback: fb,
        strengths,
        improvements,
      });
      const id = postRes.data.evaluation?._id;
      if (!id) {
        throw new Error("No evaluation id returned from server.");
      }
      const { data } = await api.patch(`/evaluations/${id}/finalize`);
      setEvaluationId(id);
      setFinalized(Boolean(data.evaluation?.isFinalized));
      showToast("Evaluation finalized and submitted.", "success");
      setShowFinalizeModal(false);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  const readOnly = finalized;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Evaluate project</h1>
          <Link
            to="/supervisor/dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Dashboard
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
          {loadingProjects ? (
            <p className="text-slate-600">Loading projects…</p>
          ) : eligibleProjects.length === 0 ? (
            <p className="text-slate-600">
              No projects in <strong>approved</strong> or <strong>in progress</strong> status are assigned to you yet.
            </p>
          ) : (
            <>
              {finalized && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                  This evaluation is finalized and can no longer be edited.
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label htmlFor="eval-project" className="block text-sm font-medium text-slate-700">
                    Project
                  </label>
                  <select
                    id="eval-project"
                    value={projectId}
                    disabled={readOnly}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60"
                  >
                    {eligibleProjects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                {loadingEval ? (
                  <p className="text-sm text-slate-600">Loading evaluation…</p>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    {[
                      { key: "proposal", label: "Proposal" },
                      { key: "implementation", label: "Implementation" },
                      { key: "documentation", label: "Documentation" },
                      { key: "presentation", label: "Presentation" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm font-medium text-slate-700">
                          <label htmlFor={`mark-${key}`}>{label}</label>
                          <span>{marks[key]}</span>
                        </div>
                        <input
                          id={`mark-${key}`}
                          type="range"
                          min={0}
                          max={25}
                          step={1}
                          disabled={readOnly}
                          value={marks[key]}
                          onChange={(e) => updateMark(key, e.target.value)}
                          className="mt-2 w-full accent-blue-600 disabled:opacity-60"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <p className="text-sm font-medium text-slate-600">Total score</p>
                    <p className="mt-1 text-4xl font-bold text-slate-900">{total}</p>
                    <p className="text-xs text-slate-500">out of 100</p>
                    <div
                      className={`mt-6 inline-flex min-w-[5rem] items-center justify-center rounded-full px-6 py-3 text-2xl font-bold shadow-sm ring-2 ring-inset ${gradeBadgeClass(previewGrade)}`}
                    >
                      {previewGrade}
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-500">
                      Grade updates as you move the sliders (preview).
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="eval-overall" className="block text-sm font-medium text-slate-700">
                    Overall feedback <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="eval-overall"
                    rows={4}
                    required
                    disabled={readOnly}
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label htmlFor="eval-strengths" className="block text-sm font-medium text-slate-700">
                    Strengths
                  </label>
                  <textarea
                    id="eval-strengths"
                    rows={3}
                    disabled={readOnly}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label htmlFor="eval-improve" className="block text-sm font-medium text-slate-700">
                    Areas for improvement
                  </label>
                  <textarea
                    id="eval-improve"
                    rows={3}
                    disabled={readOnly}
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60"
                  />
                </div>

                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={readOnly || saving}
                    onClick={saveDraft}
                    className="rounded-lg border border-blue-600 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save draft"}
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || saving}
                    onClick={() => setShowFinalizeModal(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Finalize &amp; submit
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="mt-8">
          <Link to="/supervisor/documents" className="text-sm font-medium text-blue-600 hover:underline">
            ← Review documents
          </Link>
        </p>
      </div>

      {showFinalizeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finalize-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="finalize-title" className="text-lg font-semibold text-slate-900">
              Finalize evaluation?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Once finalized, marks and feedback cannot be changed, and the project will be marked{" "}
              <strong>completed</strong>.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={finalizeSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Submitting…" : "Yes, finalize"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
