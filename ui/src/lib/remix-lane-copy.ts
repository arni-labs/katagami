/**
 * Language-detail remix-lane copy. Join the name with a space on both sides;
 * JSX whitespace after a </span> is not reliable (live read "Galleyand").
 * No em dashes. One sentence of idea, then a period, then the live-recolor note.
 */
export const LANGUAGE_REMIX_LANE_AFTER_NAME =
  "and swap a palette and an art style onto it. The landing & dashboard recolor live.";

export function languageRemixLaneVisibleText(name: string): string {
  return `Keep ${name} ${LANGUAGE_REMIX_LANE_AFTER_NAME}`;
}
