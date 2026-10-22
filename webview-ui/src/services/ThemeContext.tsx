import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "indigo" | "mint" | "peach" | "midnight";

export interface ThemeConfig {
  id: Theme;
  label: string;
  sublabel: string;
  badge: string;
  primaryColor: string;
  bgColor: string;
  accentHover: string;
}

export const THEMES: Record<Theme, ThemeConfig> = {
  indigo: {
    id: "indigo",
    label: "Indigo-Slate",
    sublabel: "Default Developer Professional",
    badge: "Default",
    primaryColor: "#4F46E5",
    bgColor: "#F8FAFC",
    accentHover: "#4338CA",
  },
  mint: {
    id: "mint",
    label: "Forest Mint",
    sublabel: "Calm, Organic, High Focus",
    badge: "Focus",
    primaryColor: "#059669",
    bgColor: "#F0FDF4",
    accentHover: "#047857",
  },
  peach: {
    id: "peach",
    label: "Sunset Peach",
    sublabel: "Warm, Creative, Welcoming",
    badge: "Warm",
    primaryColor: "#D97706",
    bgColor: "#FFFBEB",
    accentHover: "#B45309",
  },
  midnight: {
    id: "midnight",
    label: "Cyber Midnight",
    sublabel: "Sleek Dark, High Contrast, OLED",
    badge: "Dark",
    primaryColor: "#6366F1",
    bgColor: "#0B0F19",
    accentHover: "#4F46E5",
  },
};

interface ThemeContextType {
  theme: Theme;
  themeClass: string;
  setTheme: (theme: Theme) => void;
  config: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "indigo",
  themeClass: "theme-indigo",
  setTheme: () => {},
  config: THEMES.indigo,
});

const THEME_STORAGE_KEY = "agentforge.theme";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "mint" || saved === "peach" || saved === "indigo" || saved === "midnight") {
      return saved as Theme;
    }
  } catch {
    // fallback
  }
  return "indigo";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // ignore
    }
  };

  const themeClass = `theme-${theme}`;

  useEffect(() => {
    // Sync class directly to document element and body for maximum style inheritance
    document.documentElement.classList.remove("theme-indigo", "theme-mint", "theme-peach", "theme-midnight");
    document.documentElement.classList.add(themeClass);
    document.body.classList.remove("theme-indigo", "theme-mint", "theme-peach", "theme-midnight");
    document.body.classList.add(themeClass);
  }, [themeClass]);

  return (
    <ThemeContext.Provider value={{ theme, themeClass, setTheme, config: THEMES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
