import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

const THEME_KEY = "fyp_theme";

const ThemeContext = createContext(null);

function rootIsDark() {
  return document.documentElement.classList.contains("dark");
}

/** Applies theme to `<html>` and syncs `color-scheme` for native form controls / scrollbars. */
function applyDarkToDocument(dark) {
  const root = document.documentElement;
  root.classList.toggle("dark", Boolean(dark));
  root.style.colorScheme = dark ? "dark" : "light";
}

function readStoredOrSystemDark() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function applyStoredOrSystemTheme() {
  applyDarkToDocument(readStoredOrSystemDark());
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => (typeof document !== "undefined" ? rootIsDark() : false));

  useLayoutEffect(() => {
    applyStoredOrSystemTheme();
    setIsDark(rootIsDark());

    function onStorage(e) {
      if (e.key !== THEME_KEY || e.storageArea !== localStorage) return;
      applyStoredOrSystemTheme();
      setIsDark(rootIsDark());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !rootIsDark();
    applyDarkToDocument(next);
    setIsDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ toggleTheme, isDark }), [toggleTheme, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
