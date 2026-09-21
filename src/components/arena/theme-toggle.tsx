"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_KEY, THEME_SCRIPT, type Theme } from "@/lib/theme";

// The server script runs before paint; client navigation must not re-execute it.
export function ThemeScript() {
  return <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const snapshot = () => document.documentElement.classList.contains("dark");
const serverSnapshot = () => false;
export function useDarkMode() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function ThemeSync() {
  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    let preference: string | null = null;
    try { preference = localStorage.getItem(THEME_KEY); } catch { /* Use the system default. */ }
    const apply = () => document.documentElement.classList.toggle("dark", preference === "dark" || (preference !== "light" && system.matches));
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY && e.key !== null) return;
      preference = e.newValue;
      apply();
    };
    const onChoice = (e: Event) => { preference = (e as CustomEvent<Theme>).detail; apply(); };
    apply();
    system.addEventListener("change", apply);
    window.addEventListener("storage", onStorage);
    window.addEventListener("timely-theme-choice", onChoice);
    return () => {
      system.removeEventListener("change", apply);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("timely-theme-choice", onChoice);
    };
  }, []);
  return null;
}

export function ThemeToggle() {
  const dark = useDarkMode();
  return <Button variant="ghost" className="theme-toggle" role="switch" aria-label="Dark mode" aria-checked={dark} onClick={() => {
    const next: Theme = dark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    window.dispatchEvent(new CustomEvent("timely-theme-choice", { detail: next }));
    try { localStorage.setItem(THEME_KEY, next); } catch { /* The choice still works for this visit. */ }
  }}>
    <span className="theme-toggle-label"><Moon size={15} className="theme-moon" /><Sun size={15} className="theme-sun" /><span>Dark mode</span></span>
    <span className="theme-switch-track" aria-hidden="true"><span /></span>
  </Button>;
}
