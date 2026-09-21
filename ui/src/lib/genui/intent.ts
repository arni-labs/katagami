// The shapes an Ask answer can take. Jev picks one; the page lays the result
// area out in that shape. Bounded on purpose: four shapes, nothing free-form.
export const INTENTS = ["find", "compare", "palette", "wall"] as const;
export type Intent = (typeof INTENTS)[number];

export const INTENT_TEXT: Record<Intent, string> = {
  find: "The person describes a product or a need and wants the few styles that fit it best.",
  compare: "The person names two or more specific styles and wants them set against each other.",
  palette: "The person is asking about colour: palettes, hues, what colours a style uses.",
  wall: "The person wants to browse many styles at once that share a quality, rather than a short answer.",
};
