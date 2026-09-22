// The facts the privacy policy, terms and support page share. One place, so
// the operator's name or the contact address changes in one edit, for example when
// Arni Labs becomes an LLC, or once the support alias is confirmed.

/** Who provides the service. Becomes "Arni Labs LLC" once the LLC exists. */
export const OPERATOR = "Arni Labs";

/** Governing law for the terms. */
export const GOVERNING_LAW = "the State of New Jersey, USA";

/**
 * The address people write to about their data or account. Empty until the
 * arnilabs.ai support alias is confirmed; until then every page points at the
 * feedback form instead, which reaches the same person.
 */
export const CONTACT_EMAIL = "";

export const FEEDBACK_PATH = "/feedback?from=legal";

/** Bump whenever the privacy policy or terms change in substance. */
export const LEGAL_LAST_UPDATED = "22 September 2026";
