// Typed manifest for the owner-gated A/B before/after review.
//
// Each item is one design language with its ORIGINAL (before) and the REVISED
// descendant (after) it was forked into, plus the three surfaces (landing /
// embodiment / dashboard) — each carrying the before + after composition file
// ids that the page renders side-by-side. Values are inlined from the curation
// run so the page has no runtime manifest fetch.
//
// Provenance (one bake-off-style fix pass): the descendants were generated from
// targeted critique against the originals under one rulebook + revision run.
export const RULEBOOK_VERSION = "aa054051042e";
export const REVISION_RUN = "wb9gk6j9e";

export type AbSurfaceKind = "landing" | "embodiment" | "dashboard";

export interface AbSurface {
  surface: AbSurfaceKind;
  before_file_id: string;
  after_file_id: string;
}

export interface AbItem {
  /** Display name of the design language. */
  name: string;
  /** The original (before) design language entity id. */
  original_id: string;
  /** The revised descendant (after) design language entity id. */
  descendant_id: string;
  /** Optional reviewer caveat shown as a warning on the language block. */
  note: string | null;
  surfaces: AbSurface[];
}

export const AB_ITEMS: AbItem[] = [
  {
    name: "Bouba",
    original_id: "en-019efd9f-f4db-7db3-acf9-20d906c311f0",
    descendant_id: "en-019f1533-2372-78f3-b754-6a2f716d8dba",
    note: null,
    surfaces: [
      {
        surface: "landing",
        before_file_id: "fl-019efd9f-ceff-7000-97ce-157b4cef2d46",
        after_file_id: "fl-019f152f-c261-73b0-a6aa-c761f7b2f944",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019efd9f-c73d-7710-a878-be08f247430d",
        after_file_id: "fl-019f152f-c528-7842-ab5f-82eb3bf55d1d",
      },
      {
        surface: "dashboard",
        before_file_id: "fl-019efd9f-d25c-7432-bddd-2b861ae2b773",
        after_file_id: "fl-019f152f-c847-77b1-866e-4ab52ce21f98",
      },
    ],
  },
  {
    name: "Gloaming",
    original_id: "en-019efdd8-0abe-7a33-af5b-e17b74d76a68",
    descendant_id: "en-019f1526-827f-7c52-b121-4b4e64a86666",
    note: null,
    surfaces: [
      {
        surface: "landing",
        before_file_id: "fl-019efdd7-f9ea-7850-a1af-260009245114",
        after_file_id: "fl-019f1530-6e07-7d21-b770-a6988db16926",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019efdd7-f707-7713-9253-6d9cfd46184c",
        after_file_id: "fl-019f1530-70e7-7ae1-868a-459dd07f8bfd",
      },
      {
        surface: "dashboard",
        before_file_id: "fl-019efdd7-fc2e-7ad3-ad42-a9194cef23a7",
        after_file_id: "fl-019f1530-791a-7210-a072-c8880816539c",
      },
    ],
  },
  {
    name: "Cadence",
    original_id: "en-019efd27-384d-7dc1-a053-cd1193c95856",
    descendant_id: "en-019f152e-a9c5-73c0-9b4a-d51d39308fe1",
    note: null,
    surfaces: [
      {
        surface: "landing",
        before_file_id: "fl-019efd27-1cd6-7bd1-bce1-982cc3dbde98",
        after_file_id: "fl-019f152c-f79c-7f41-a68e-ee23d7edd1d0",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019efd27-15d5-7173-b070-382f8e00ef88",
        after_file_id: "fl-019f152c-f523-7ac1-948a-b6093925e915",
      },
      {
        surface: "dashboard",
        before_file_id: "fl-019efd27-23f2-7370-b14d-d9fd023819c5",
        after_file_id: "fl-019f152c-f9d1-7f73-ab1e-f3617afde3cf",
      },
    ],
  },
  {
    name: "Celadon",
    original_id: "en-019efdd9-8a27-7f23-a206-ed48cae66ca2",
    descendant_id: "en-019f1534-1eed-7d92-9bea-7dd8223fca96",
    note: "Imagery fix pending (gpt-image-2 billing-blocked) — the AFTER keeps the original ceramic images. Judge the type / fixed chart / flattened cards / unified radii / cleaned gradient, not the photos.",
    surfaces: [
      {
        surface: "landing",
        before_file_id: "fl-019efdd9-6ab5-7880-a551-c721d89004bc",
        after_file_id: "fl-019f1530-68be-73a0-ba45-ae4e54fb0dcf",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019efdd9-6369-7fe3-b595-8703bff7c9ba",
        after_file_id: "fl-019f1530-6665-7153-b620-3a72b7442ca2",
      },
      {
        surface: "dashboard",
        before_file_id: "fl-019efdd9-725e-7221-a585-654941cbb088",
        after_file_id: "fl-019f1530-6411-7712-8061-e52916ab3eff",
      },
    ],
  },
  {
    name: "Fumage",
    original_id: "atmospheric-noir-art-magazine",
    descendant_id: "en-019f2e77-7c1f-7ff2-90f6-607e666af508",
    note:
      "Reimagine batch 1 (2026-07-04): full current-format rebuild of an old-generation UnderReview language — the original had an embodiment only, so landing/dashboard show BEFORE as absent by design.",
    surfaces: [
      {
        surface: "landing",
        before_file_id: "",
        after_file_id: "fl-019f2e76-4b29-77c3-bf19-ff639890f213",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019df649-46e6-78f1-9296-83847c2d628a",
        after_file_id: "fl-019f2e76-493b-7122-9fae-3aabf6279d37",
      },
      {
        surface: "dashboard",
        before_file_id: "",
        after_file_id: "fl-019f2e76-4d78-7123-8d45-b57ff2f93246",
      },
    ],
  },
  {
    name: "Kardex",
    original_id: "austere-identity-operating-systems",
    descendant_id: "en-019f2e75-1dec-76e2-9380-2adde9fed568",
    note:
      "Reimagine batch 1 (2026-07-04): full current-format rebuild of an old-generation UnderReview language — the original had an embodiment only, so landing/dashboard show BEFORE as absent by design.",
    surfaces: [
      {
        surface: "landing",
        before_file_id: "",
        after_file_id: "fl-019f2e73-5ca1-70f1-9e5f-e3c2a90855cf",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019e18fc-ea6d-7df2-b8f1-b2f07ad9a2a1",
        after_file_id: "fl-019f2e73-5a0d-7ae1-a23d-064d270a090f",
      },
      {
        surface: "dashboard",
        before_file_id: "",
        after_file_id: "fl-019f2e73-5f71-7cc3-a9e0-9b783cfbd115",
      },
    ],
  },
  {
    name: "Nighthawk",
    original_id: "bebop-noir-terminal-lounge",
    descendant_id: "en-019f2e6e-d19d-72b2-8500-d710161f6627",
    note:
      "Reimagine batch 1 (2026-07-04): full current-format rebuild of an old-generation UnderReview language — the original had an embodiment only, so landing/dashboard show BEFORE as absent by design.",
    surfaces: [
      {
        surface: "landing",
        before_file_id: "",
        after_file_id: "fl-019f2e6d-69cb-7980-bd0b-626dbb946852",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019e04a0-16a1-7dc3-adf1-e9aa4ba10247",
        after_file_id: "fl-019f2e6d-675a-7711-b3ff-25af6994f90a",
      },
      {
        surface: "dashboard",
        before_file_id: "",
        after_file_id: "fl-019f2e6d-6c24-7cd1-95e1-75b17a1f6a1c",
      },
    ],
  },
  {
    name: "Ferrite",
    original_id: "cassette-cyberpunk-lab-notes",
    descendant_id: "en-019f2e78-a19f-7c62-9aed-d62770afac6a",
    note:
      "Reimagine batch 1 (2026-07-04): full current-format rebuild of an old-generation UnderReview language — the original had an embodiment only, so landing/dashboard show BEFORE as absent by design.",
    surfaces: [
      {
        surface: "landing",
        before_file_id: "",
        after_file_id: "fl-019f2e77-38da-7941-bcb2-40a70e58c2fa",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019e04ce-8b81-76e0-806e-343a197086b2",
        after_file_id: "fl-019f2e77-367a-7242-a178-01fd7d30e71f",
      },
      {
        surface: "dashboard",
        before_file_id: "",
        after_file_id: "fl-019f2e77-3b9c-7e31-aa8f-32279498233c",
      },
    ],
  },
  {
    name: "Galley",
    original_id: "chromatic-ink-marginalia",
    descendant_id: "en-019f2e78-8711-7072-b72d-200b095d9a51",
    note:
      "Reimagine batch 1 (2026-07-04): full current-format rebuild of an old-generation UnderReview language — the original had an embodiment only, so landing/dashboard show BEFORE as absent by design.",
    surfaces: [
      {
        surface: "landing",
        before_file_id: "",
        after_file_id: "fl-019f2e77-3b01-7503-9e61-1630905faab3",
      },
      {
        surface: "embodiment",
        before_file_id: "fl-019dd686-7586-72d3-bd4b-1dfeeb726188",
        after_file_id: "fl-019f2e77-3915-7083-8e62-9d1950a0f890",
      },
      {
        surface: "dashboard",
        before_file_id: "",
        after_file_id: "fl-019f2e77-3d17-72f3-934b-2ddb8c0966b0",
      },
    ],
  },
];
