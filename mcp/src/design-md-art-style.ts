/** DESIGN.md must name and link the paired art style and require real images. */

export function pairsWithFromImagery(raw: unknown): string | undefined {
  let rec = raw;
  if (typeof raw === "string") {
    try {
      rec = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return undefined;
  const value = (rec as { pairs_with?: unknown }).pairs_with;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function designMdArtStyleErrors(markdown: string): string | null {
  if (!markdown.includes("## Art Style")) {
    return "DESIGN.md must include an ## Art Style section that links the paired art style.";
  }
  if (!markdown.includes("/art-styles/")) {
    return "DESIGN.md must link the paired art style at /art-styles/<id>.";
  }
  if (!markdown.includes("MUST generate real images")) {
    return "DESIGN.md must require real images in the paired art style (MUST generate real images).";
  }
  if (!/art_style:\s*\n\s+name:/.test(markdown)) {
    return "DESIGN.md front matter must include art_style.name (and slug/url).";
  }
  return null;
}
