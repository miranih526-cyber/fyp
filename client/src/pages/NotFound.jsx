import { useNavigate } from "react-router-dom";
import { IconMoodEmpty } from "@tabler/icons-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <IconMoodEmpty className="h-16 w-16 text-slate-300 dark:text-slate-600" stroke={1.25} aria-hidden />
      <p className="mt-4 text-8xl font-black text-slate-300 dark:text-slate-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-md text-center text-slate-600 dark:text-slate-400">
        The address may be wrong or the page was removed.
      </p>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
      >
        Go back
      </button>
    </div>
  );
}
