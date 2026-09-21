export function tokenValue(key: string, value: unknown): string;
export function cssVars(prefix: string, group: unknown): string[];
export function typeMetrics(typography: unknown): Record<string, unknown>;
export function tailwindSpacing(spacing: unknown): Record<string, string>;
export function tokensToCss(tokens: unknown): { css: string; fontsUrl: string | null };
export function tokensToTailwind(tokens: unknown): { theme: { extend: Record<string, unknown> } };
