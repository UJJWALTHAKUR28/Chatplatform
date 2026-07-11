"use client";
// ThemeContext — light/dark theme, persisted to localStorage, defaults to
// the visitor's OS preference on first visit. Pairs with the inline script
// in app/layout.tsx that sets data-theme before first paint (no flash).

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // The inline script in <head> already applied the correct data-theme
    // attribute before React mounts — read it back so state matches the DOM.
    const [theme, setThemeState] = useState<Theme>("dark");

    useEffect(() => {
        const current = document.documentElement.getAttribute("data-theme");
        if (current === "light" || current === "dark") setThemeState(current);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* private browsing / storage disabled — theme just won't persist */
        }
    }, [theme]);

    const setTheme = useCallback((t: Theme) => setThemeState(t), []);
    const toggleTheme = useCallback(
        () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
        []
    );

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
    return ctx;
}