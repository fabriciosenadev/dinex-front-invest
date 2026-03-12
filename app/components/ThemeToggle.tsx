"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, ThemeMode } from "../../lib/theme";

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
      return;
    }

    const currentTheme = document.documentElement.dataset.theme;
    if (currentTheme === "dark" || currentTheme === "light") {
      setTheme(currentTheme);
    }
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      className={compact ? "theme-toggle compact" : "theme-toggle"}
      onClick={toggleTheme}
      title={theme === "dark" ? "Ativar modo claro" : "Ativar modo noturno"}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo noturno"}
    >
      {compact ? (theme === "dark" ? "☀" : "☾") : theme === "dark" ? "Modo claro" : "Modo noturno"}
    </button>
  );
}
