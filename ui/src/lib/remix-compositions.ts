// Canonical compositions + image slots. Mirrors the seed in
// katagami-curation/seed-data/element_manifest.toml (SetCompositions). Kept as a
// UI constant so the studio and the brief route don't need a manifest fetch.
// `subject` is what each picture shows; `{product}` is the product the brief
// is for, or "the product" when none was given.
import type { RemixComposition } from "@/lib/remix-brief";

export const COMPOSITIONS: RemixComposition[] = [
  {
    key: "compositions.landing",
    name: "Landing Page",
    description: "Hero, features, testimonials, CTA, footer",
    image_slots: [
      { key: "hero", subject_hint: "wide establishing hero scene", subject: "a wide establishing scene of the world of {product}", aspect: "16:9" },
      { key: "feature-1", subject_hint: "single concept object", subject: "one object that stands for something {product} does", aspect: "1:1" },
      { key: "feature-2", subject_hint: "single concept object", subject: "one object that stands for something {product} does", aspect: "1:1" },
      { key: "feature-3", subject_hint: "single concept object", subject: "one object that stands for something {product} does", aspect: "1:1" },
      { key: "testimonial-avatar-1", subject_hint: "portrait bust", subject: "a person who uses {product}", aspect: "1:1" },
      { key: "testimonial-avatar-2", subject_hint: "portrait bust", subject: "a person who uses {product}", aspect: "1:1" },
      { key: "footer-bg", subject_hint: "subtle ambient texture band", subject: "a quiet, low-information field of texture from the world of {product}", aspect: "21:9" },
    ],
  },
  {
    key: "compositions.dashboard",
    name: "Dashboard",
    description: "Sidebar nav, stat cards, charts, data table",
    image_slots: [
      { key: "avatar", subject_hint: "user avatar portrait bust", subject: "a person who uses {product}", aspect: "1:1" },
      { key: "empty-state", subject_hint: "empty data state, single friendly object", subject: "one small object that implies nothing is here yet in {product}", aspect: "4:3" },
    ],
  },
  {
    key: "compositions.auth-page",
    name: "Auth Page",
    description: "Centered form, branding, social login",
    image_slots: [
      { key: "brand-illustration", subject_hint: "brand emblem, welcoming motif", subject: "one emblem-like object that stands for {product}", aspect: "1:1" },
      { key: "background", subject_hint: "ambient backdrop", subject: "a quiet, low-information field of texture from the world of {product}", aspect: "3:2" },
    ],
  },
  {
    key: "compositions.error-page",
    name: "Error Page",
    description: "Full-page 404/500 with illustration and recovery",
    image_slots: [
      { key: "illustration", subject_hint: "lost or not-found motif, single object", subject: "one lost or misplaced object from the world of {product}", aspect: "4:3" },
    ],
  },
  {
    key: "compositions.settings-page",
    name: "Settings Page",
    description: "Sidebar nav, grouped form controls",
    image_slots: [
      { key: "avatar", subject_hint: "user avatar portrait bust", subject: "a person who uses {product}", aspect: "1:1" },
    ],
  },
];
