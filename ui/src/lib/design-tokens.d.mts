export function tokenValue(key: string, value: unknown): string;
export function cssVars(prefix: string, group: unknown): string[];
export function typeMetrics(typography: unknown): Record<string, unknown>;
export function tailwindSpacing(spacing: unknown): Record<string, string>;
export function tokenName(key: string): string;
export function tokensToCss(tokens: unknown): { css: string; fontsUrl: string | null; omitted: { token: string; undefined_variables: string[] }[] };
export function tokensToTailwind(tokens: unknown): { theme: { extend: Record<string, unknown> } };
