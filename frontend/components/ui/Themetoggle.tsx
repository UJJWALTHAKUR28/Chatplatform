"use client";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className={`relative flex h-8 w-[52px] flex-shrink-0 items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-[3px] ${className}`}
        >
            <Sun className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)]" />
            <Moon className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)]" />
            <span
                className="absolute left-[3px] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: isDark ? "translateX(23px)" : "translateX(0px)" }}
            >
                {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </span>
        </button>
    );
}