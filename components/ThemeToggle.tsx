"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";

type ThemeMode = "dark" | "light";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem("visapilot.theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("visapilot.theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const resolvedTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : systemTheme;
    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vp-border)] bg-[var(--vp-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--vp-text-primary)] transition hover:border-[color:var(--vp-border-strong)]"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--vp-card)] text-[color:var(--vp-text-primary)]">
        {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </span>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}