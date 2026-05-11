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

function gradeCircleClass(grade) {
  switch (grade) {
    case "A+":
      return "bg-emerald-600 text-white ring-emerald-300";
    case "A":
      return "bg-green-600 text-white ring-green-300";
    case "B+":
      return "bg-lime-500 text-slate-900 ring-lime-300";
    case "B":
      return "bg-amber-400 text-slate-900 ring-amber-200";
    case "C":
      return "bg-orange-500 text-white ring-orange-200";
    default:
      return "bg-red-600 text-white ring-red-300";
  }
}

const ROWS = [
  { key: "proposal", label: "Proposal" },
  { key: "implementation", label: "Implementation" },
  { key: "documentation", label: "Documentation" },
  { key: "presentation", label: "Presentation" },
];

function NotEvaluatedIllustration() {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center">
      <div className="relative h-40 w-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 shadow-inner" />
        <svg
          className="absolute inset-6 text-slate-400"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="10" y="14" width="44" height="36" rx="4" stroke="currentColor" strokeWidth="3" />
          <path d="M18 26h28M18 34h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="46" r="8" fill="#cbd5e1" />
          <path d="M45 46l2 2 4-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        Your grade will appear here once your supervisor completes the evaluation.
      </p>
    </div>
  );
}

export default function ViewGrades() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError("");
    try {
      const { data } = await api.get("/projects");
      const list = data.projects || [];
      setProjects(list);
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

  useEffect(() => {
    if (!loadingProjects && projects.length > 0 && !projectId) {
      setProjectId(projects[0]._id);
    }
  }, [loadingProjects, projects, projectId]);

  const loadEvaluation = useCallback(async (pid) => {
    if (!pid) {
      setEvaluation(null);
      return;
    }
    setLoadingEval(true);
    setError("");
    try {
      const { data } = await api.get(`/evaluations/project/${pid}`);
      setEvaluation(data.evaluation || null);
    } catch (err) {
      setEvaluation(null);
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoadingEval(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (projectId) loadEvaluation(projectId);
  }, [projectId, loadEvaluation]);

  const selectedTitle = useMemo(() => {
    const p = projects.find((x) => x._id === projectId);
    return p?.title || "";
  }, [projects, projectId]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">View grades</h1>
          <Link
            to="/student/dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Dashboard
          </Link>
        </div>

        {loadingProjects ? (
          <p className="text-slate-600">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            You have no projects yet.{" "}
            <Link to="/student/submit-project" className="font-medium text-blue-600 hover:underline">
              Submit a project
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label htmlFor="grade-project" className="block text-sm font-medium text-slate-700">
                Select project
              </label>
              <select
                id="grade-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-2 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}

            {loadingEval ? (
              <p className="text-slate-600">Loading evaluation…</p>
            ) : !evaluation ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                <NotEvaluatedIllustration />
                <p className="mt-6 text-lg font-medium text-slate-800">
                  Your project has not been evaluated yet
                </p>
                {selectedTitle ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Project: <span className="font-medium text-slate-800">{selectedTitle}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                {!evaluation.isFinalized && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <strong>Evaluation in draft</strong> — final grade not yet released. Your supervisor may still
                    change scores and feedback.
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Overall grade</p>
                    <div
                      className={`flex h-32 w-32 items-center justify-center rounded-full text-4xl font-bold shadow-lg ring-4 ${gradeCircleClass(
                        evaluation.grade
                      )}`}
                    >
                      {evaluation.grade}
                    </div>
                    <p className="text-lg font-semibold text-slate-800">
                      Total: {evaluation.totalMarks}
                      <span className="text-sm font-normal text-slate-500"> / 100</span>
                    </p>
                  </div>

                  <div className="mt-10 overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-slate-700">Criterion</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Score</th>
                          <th className="px-4 py-3 font-semibold text-slate-700">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {ROWS.map(({ key, label }) => (
                          <tr key={key}>
                            <td className="px-4 py-3 text-slate-800">{label}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {evaluation.marks?.[key] ?? 0}
                            </td>
                            <td className="px-4 py-3 text-slate-500">25</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <section className="mt-8">
                    <h2 className="text-base font-semibold text-slate-900">Overall feedback</h2>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 text-slate-800">
                      {evaluation.overallFeedback}
                    </p>
                  </section>

                  {evaluation.strengths ? (
                    <section className="mt-6">
                      <h2 className="text-base font-semibold text-slate-900">Strengths</h2>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-green-50/80 px-4 py-3 text-slate-800">
                        {evaluation.strengths}
                      </p>
                    </section>
                  ) : null}

                  {evaluation.improvements ? (
                    <section className="mt-6">
                      <h2 className="text-base font-semibold text-slate-900">Areas for improvement</h2>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50/80 px-4 py-3 text-slate-800">
                        {evaluation.improvements}
                      </p>
                    </section>
                  ) : null}
                </div>
              </div>
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
