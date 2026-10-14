import { useEffect, useState } from "react";

type Theme = "auto" | "light" | "dark";
const ORDER: Theme[] = ["auto", "light", "dark"];
const LABEL: Record<Theme, string> = { auto: "Som systemet", light: "Lyst", dark: "Mørkt" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") setTheme(t);
  }, []);

  const next = () => {
    const t = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(t);
    const root = document.documentElement;
    try {
      if (t === "auto") {
        delete root.dataset.theme;
        localStorage.removeItem("theme");
      } else {
        root.dataset.theme = t;
        localStorage.setItem("theme", t);
      }
    } catch {
      if (t !== "auto") root.dataset.theme = t;
    }
  };

  return (
    <button type="button" className="theme" onClick={next} aria-label={`Tema: ${LABEL[theme]}. Trykk for å bytte.`}>
      <ThemeIcon theme={theme} />
      <span>{LABEL[theme]}</span>
    </button>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {theme === "auto" && <path d="M9 2a7 7 0 0 1 0 14z" fill="currentColor" />}
      {theme === "dark" && <circle cx="9" cy="9" r="7" fill="currentColor" />}
    </svg>
  );
}
