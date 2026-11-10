import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "george-theme";

type ThemeCtx = { theme: Theme; isLight: boolean; setTheme: (t: Theme) => void; toggleTheme: () => void };
const Ctx = createContext<ThemeCtx | null>(null);

/** Single source of truth: only this provider touches html.light and the stored choice. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    let saved: Theme = "dark";
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "light") saved = "light";
    } catch {
      /* storage unavailable */
    }
    setThemeState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === "light" ? "dark" : "light"), [theme, setTheme]);

  return <Ctx.Provider value={{ theme, isLight: theme === "light", setTheme, toggleTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
