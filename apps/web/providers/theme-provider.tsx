"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeCtx = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
  toggle: () => {},
});

function getSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme, resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // initial
  useEffect(() => {
    const saved = (localStorage.getItem("mera-hisab-theme") as Theme | null) ?? "system";
    setThemeState(saved);
    const r = saved === "system" ? getSystem() : saved;
    setResolved(r);
    apply(saved, r);
    // listen to system changes if system mode
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("mera-hisab-theme") as Theme) === "system" || !localStorage.getItem("mera-hisab-theme")) {
        const nr = mql.matches ? "dark" : "light";
        setResolved(nr);
        apply("system", nr);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem("mera-hisab-theme", t);
    setThemeState(t);
    const r = t === "system" ? getSystem() : t;
    setResolved(r);
    apply(t, r);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = resolved === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolved, setTheme]);

  return <ThemeCtx.Provider value={{ theme, resolved, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
