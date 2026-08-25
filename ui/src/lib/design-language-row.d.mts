// Types for the plain-ESM row normalizer. The implementation lives in
// design-language-row.mjs (authored as JS so any Node version can import it in
// the contract test); these declarations give the app the real TS types.
import type { DesignLanguage } from "./odata";

export function parseODataEntityId(value: unknown): string | undefined;

/** Normalize a DesignLanguages OData row (flat $select or nested) to the
 *  nested shape the codebase reads. Throws if a flat row has no recoverable
 *  entity id (no `Id`, no `@odata.id`) — an id-less row is never valid. */
export function normalizeDesignLanguageRow(
  raw: Record<string, unknown>,
): DesignLanguage;
