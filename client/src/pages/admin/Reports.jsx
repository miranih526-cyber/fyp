import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../api/axios.js";
import { useToast } from "../../context/ToastContext.jsx";

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return "Something went wrong.";
  return data.message || "Request failed.";
}

const PIE_COLORS = ["#0ea5e9", "#22c55e", "#eab308", "#f97316", "#64748b"];

async function downloadProjectsCsv() {
  const res = await api.get("/admin/reports/projects-csv", { responseType: "blob" });
  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "projects-export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function Reports() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/admin/reports");
      setData(d);
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

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      await downloadProjectsCsv();
      showToast("CSV downloaded.", "success");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setExporting(false);
    }
  }

  const pieData =
    data?.projectsByStatus?.map((x) => ({
      name: (x.status || "").replace(/_/g, " "),
      value: x.count,
    })) || [];

  const lineData =
    data?.submissionsByMonth?.map((x) => ({
      month: x.month,
      submissions: x.count,
    })) || [];

  return (
    <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export projects CSV"}
            </button>
            <Link
              to="/admin/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Admin dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {loading || !data ? (
          <p className="text-slate-600">Loading reports…</p>
        ) : (
          <div className="space-y-10">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Grade distribution</h2>
              <p className="text-sm text-slate-600">Finalized evaluations only</p>
              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gradeDistribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Projects" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Projects by status</h2>
              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Submissions timeline</h2>
              <p className="text-sm text-slate-600">Last 6 months</p>
              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="submissions" stroke="#7c3aed" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}
    </div>
  );
}
