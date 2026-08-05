"use client";

import { useT } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, design, toggleTheme } = useTheme();
  const t = useT();
  const isMinimal = design === "minimal";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-9 w-9 items-center justify-center text-[var(--foreground)] transition hover:opacity-80 ${
        isMinimal
          ? "rounded-[10px] bg-[var(--muted)]"
          : "h-10 w-10 rounded-full border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)] hover:bg-[var(--muted)]"
      } ${className}`}
      aria-label={
        theme === "light"
          ? t("settings.switchToDark")
          : t("settings.switchToLight")
      }
      title={t("settings.appearance")}
    >
      {theme === "light" ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
