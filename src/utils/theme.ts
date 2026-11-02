import { useState, useEffect } from "react";

export type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "omni_theme_preference";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (e) {
      console.warn("Could not read theme from localStorage", e);
    }
    return "dark"; // Default: Sophisticated Dark
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      const root = document.documentElement;
      if (theme === "light") {
        root.classList.add("theme-light");
        root.classList.remove("theme-dark");
      } else {
        root.classList.add("theme-dark");
        root.classList.remove("theme-light");
      }
    } catch (e) {
      console.warn("Could not save theme to localStorage", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, setTheme, toggleTheme };
}
