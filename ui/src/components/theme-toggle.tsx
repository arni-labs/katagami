"use client";

import { useTheme } from "@/lib/use-theme";
import { CHROME_STAMP, CHROME_STAMP_LABEL } from "@/lib/chrome-stamp";

// Theme toggle: a chrome stamp in the header row. Shows the CURRENT mode
// (sun + 昼 for day, moon + 夜 for night) and flips on click. No catalog
// tilt — it sits upright with search / sign-in / menu.
export function ThemeToggle() {
  const { theme, toggle, mounted } = useTheme();
  const isDark = theme === "dark";
  const nextLabel = isDark ? "switch to day mode" : "switch to night mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      suppressHydrationWarning
      className={`${CHROME_STAMP} font-mono`}
      style={{
        color: isDark ? "var(--yuzu)" : "var(--ramune)",
      }}
    >
      <span
        aria-hidden
        className="relative inline-flex h-3.5 w-3.5 items-center justify-center"
      >
        {mounted && isDark ? <MoonGlyph /> : <SunGlyph />}
      </span>
      <span suppressHydrationWarning className={CHROME_STAMP_LABEL}>
        {mounted && isDark ? "夜" : "昼"}
      </span>
    </button>
  );
}

function SunGlyph() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="h-[14px] w-[14px]"
      aria-hidden
    >
      <circle cx="7" cy="7" r="2.6" />
      <path d="M7 1.2v1.6M7 11.2v1.6M1.2 7h1.6M11.2 7h1.6M2.9 2.9l1.15 1.15M9.95 9.95l1.15 1.15M2.9 11.1l1.15-1.15M9.95 4.05l1.15-1.15" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[14px] w-[14px]"
      aria-hidden
    >
      <path d="M11.6 8.4A4.8 4.8 0 1 1 5.6 2.4a3.8 3.8 0 0 0 6 6Z" />
    </svg>
  );
}
