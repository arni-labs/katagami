import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { ThemeFonts } from "@/components/genui/screen";
import { getDesign } from "@/lib/catalog";
import { themeFromTokens } from "@/lib/genui/theme";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { visibleLanguages } from "@/lib/genui/languages";
import { Embody } from "./embody";

// Lab prototype 1: a language's page where you type what you want and see it
// built in that language. Unlisted; reachable only by URL.

export const dynamic = "force-dynamic";

export default async function EmbodyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ brief?: string }> }) {
  const { id } = await params;
  const { brief } = await searchParams;
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const [design, { languages }] = await Promise.all([getDesign("language", id, tier), visibleLanguages()]);
  if (!design) notFound();
  const theme = themeFromTokens(design.id, design.name, design.tokens);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <ThemeFonts themes={[theme]} />
      <PageHero
        eyebrow={
          <>
            <Link href="/lab/embody" className="ink-underline">Lab · live embodiment</Link>
          </>
        }
        eyebrowAccent="sakura"
        title={design.name}
        description="Say what screen you want. Jev picks from a fixed catalogue — shape, parts, density, emphasis — and the page renders that choice in this language's own tokens. Nothing is generated; everything is chosen."
        rightSlot={
          <Link href={`/language/${design.id}`} className="ink-underline font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Open the language →
          </Link>
        }
      />
      <Embody theme={theme} languages={languages} initialBrief={brief ?? ""} />
    </div>
  );
}
