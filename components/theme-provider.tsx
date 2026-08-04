"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type DesignTheme = "atlas" | "minimal";
export type Appearance = "light" | "dark";

const DESIGN_KEY = "travelmap.design";
const APPEARANCE_KEY = "travelmap.appearance";
const LEGACY_THEME_KEY = "fta-theme";

type ThemeContextValue = {
  /** @deprecated alias for appearance — kept for map/components */
  theme: Appearance;
  appearance: Appearance;
  design: DesignTheme;
  setAppearance: (appearance: Appearance) => void;
  setDesign: (design: DesignTheme) => void;
  setTheme: (theme: Appearance) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  appearance: "light",
  design: "atlas",
  setAppearance: () => {},
  setDesign: () => {},
  setTheme: () => {},
  toggleTheme: () => {},
});

function readDesign(): DesignTheme {
  if (typeof window === "undefined") return "atlas";
  const stored = window.localStorage.getItem(DESIGN_KEY);
  return stored === "minimal" ? "minimal" : "atlas";
}

function readAppearance(): Appearance {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(APPEARANCE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const legacy = window.localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === "light" || legacy === "dark") return legacy;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyToDocument(design: DesignTheme, appearance: Appearance) {
  const root = document.documentElement;
  root.dataset.design = design;
  root.dataset.theme = appearance;
  root.classList.toggle("dark", appearance === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [design, setDesignState] = useState<DesignTheme>("atlas");
  const [appearance, setAppearanceState] = useState<Appearance>("light");

  useEffect(() => {
    const nextDesign = readDesign();
    const nextAppearance = readAppearance();
    setDesignState(nextDesign);
    setAppearanceState(nextAppearance);
    applyToDocument(nextDesign, nextAppearance);
  }, []);

  const setDesign = useCallback(
    (next: DesignTheme) => {
      setDesignState(next);
      window.localStorage.setItem(DESIGN_KEY, next);
      applyToDocument(next, appearance);
    },
    [appearance],
  );

  const setAppearance = useCallback(
    (next: Appearance) => {
      setAppearanceState(next);
      window.localStorage.setItem(APPEARANCE_KEY, next);
      window.localStorage.setItem(LEGACY_THEME_KEY, next);
      applyToDocument(design, next);
    },
    [design],
  );

  const setTheme = useCallback(
    (next: Appearance) => {
      setAppearance(next);
    },
    [setAppearance],
  );

  const toggleTheme = useCallback(() => {
    setAppearance(appearance === "light" ? "dark" : "light");
  }, [appearance, setAppearance]);

  return (
    <ThemeContext.Provider
      value={{
        theme: appearance,
        appearance,
        design,
        setAppearance,
        setDesign,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
