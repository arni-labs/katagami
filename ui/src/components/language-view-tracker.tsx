"use client";

import { useEffect } from "react";
import { trackLanguageView } from "@/lib/analytics";

/** Fires a `language_view` RUM event (carrying the language NAME + id) once when
 *  a design-language detail page mounts. Renders nothing. The automatic RUM page
 *  view only knows the id from the URL; this adds the readable name so dashboards
 *  can rank languages by name and dedupe to unique visitors. */
export function LanguageViewTracker({
  languageId,
  languageName,
  slug,
}: {
  languageId: string;
  languageName?: string;
  slug?: string;
}) {
  useEffect(() => {
    trackLanguageView({ languageId, languageName, slug });
  }, [languageId, languageName, slug]);
  return null;
}
