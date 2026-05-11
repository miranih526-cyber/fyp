import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconFolder, IconFileCheck, IconChartBar } from "@tabler/icons-react";
import api from "../../api/axios.js";

export default function SupervisorHome() {
  const [assignedCount, setAssignedCount] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [pendingEval, setPendingEval] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/projects");
      const projects = data.projects || [];
      setAssignedCount(projects.length);

      const counts = await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.get(`/submissions/project/${p._id}`);
            const subs = res.data.submissions || [];
            return subs.filter((s) => !s.supervisorReviewed).length;
          } catch {
            return 0;
          }
        })
      );
      setPendingReviews(counts.reduce((a, b) => a + b, 0));

      let evalNeed = 0;
      for (const p of projects) {
        if (!["approved", "in_progress"].includes(p.status)) continue;
        try {
          const evRes = await api.get(`/evaluations/project/${p._id}`);
          const ev = evRes.data.evaluation;
          if (!ev || !ev.isFinalized) evalNeed += 1;
        } catch {
          evalNeed += 1;
        }
      }
      setPendingEval(evalNeed);
    } catch {
      setAssignedCount(0);
      setPendingReviews(0);
      setPendingEval(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Supervisor overview</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">Key metrics for your assigned work.</p>

      {loading ? (
        <p className="mt-8 text-slate-600 dark:text-slate-400">Loading…</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <IconFolder className="h-7 w-7 text-primary" stroke={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">Assigned projects</p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{assignedCount}</p>
            <Link to="/supervisor/projects" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <IconFileCheck className="h-7 w-7 text-amber-500" stroke={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">Pending document reviews</p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{pendingReviews}</p>
            <Link to="/supervisor/documents" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Review documents →
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <IconChartBar className="h-7 w-7 text-violet-500" stroke={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">Pending evaluations</p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{pendingEval}</p>
            <Link to="/supervisor/evaluate" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Evaluate →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quick links</h2>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm">
          <li>
            <Link className="font-medium text-primary hover:underline" to="/supervisor/evaluate">
              Evaluate projects
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
