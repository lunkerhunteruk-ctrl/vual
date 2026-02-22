'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'vual' | 'modern' | 'organic' | 'street' | 'elegant';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

const themes: Theme[] = ['vual', 'modern', 'organic', 'street', 'elegant'];

export function ThemeProvider({
  children,
  defaultTheme = 'vual',
  storageKey = 'vual-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(storageKey) as Theme | null;
    if (stored && themes.includes(stored)) {
      setThemeState(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(storageKey, theme);
    }
  }, [theme, mounted, storageKey]);

  const setTheme = (newTheme: Theme) => {
    if (themes.includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div data-theme={defaultTheme}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      <div data-theme={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
