import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

export default function SubmitProject() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [technologies, setTechnologies] = useState([]);
  const [techInput, setTechInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function addTechnology(raw) {
    const t = String(raw).trim();
    if (!t) return;
    if (technologies.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTechInput("");
      return;
    }
    setTechnologies((prev) => [...prev, t]);
    setTechInput("");
  }

  function handleTechKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTechnology(techInput);
    }
  }

  function removeTechnology(index) {
    setTechnologies((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        technologies,
        expectedEndDate: expectedEndDate || undefined,
      };
      await api.post("/projects", payload);
      setSuccess(true);
      showToast("Project submitted.", "success");
      setTimeout(() => {
        navigate("/student/projects", { replace: true });
      }, 1400);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Submit project</h1>
          <Link
            to="/student/projects"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            My projects
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="proj-title" className="block text-sm font-medium text-slate-700">
                Project title
              </label>
              <input
                id="proj-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="proj-desc" className="block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="proj-desc"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="proj-tech" className="block text-sm font-medium text-slate-700">
                Technologies
              </label>
              <p className="mt-0.5 text-xs text-slate-500">Type a technology and press Enter to add.</p>
              <input
                id="proj-tech"
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleTechKeyDown}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                placeholder="e.g. React"
              />
              {technologies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {technologies.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTechnology(index)}
                        className="ml-0.5 rounded-full p-0.5 text-blue-700 hover:bg-blue-200 hover:text-blue-900"
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="proj-end" className="block text-sm font-medium text-slate-700">
                Expected end date
              </label>
              <input
                id="proj-end"
                type="date"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
                Project submitted successfully. Redirecting…
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || success}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit project"}
              </button>
              <Link
                to="/student/dashboard"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
