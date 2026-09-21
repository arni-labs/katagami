import type { Metadata } from "next";
import { Screen, ThemeFonts } from "@/components/genui/screen";
import { getDesign } from "@/lib/catalog";
import { themeFromTokens } from "@/lib/genui/theme";
import { BRIEF_MAX, planScreen } from "@/lib/genui/plan";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

// Lab prototype 3: the screen at a stable URL, bare, for an agent to hand to
// its user. Outside the (site) route group so there is no site chrome around
// it: the page IS the screen. The plan and theme are also embedded as JSON so
// a fetching agent can read what was chosen without parsing markup.
//
//   /lab/preview?language=<id or slug>&brief=<what the screen is for>

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { language?: string; brief?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { language, brief } = await searchParams;
  return { title: brief && language ? `${brief} — a Katagami preview` : "Katagami preview", robots: { index: false } };
}

function Bare({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Katagami · lab preview</p>
      <div className="mt-4 text-[17px] leading-relaxed">{children}</div>
    </main>
  );
}

export default async function PreviewPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { language = "", brief = "" } = await searchParams;
  const id = language.trim();
  const text = brief.trim().slice(0, BRIEF_MAX);
  if (!id || text.length < 4) {
    return (
      <Bare>
        <p>Give it a language and a brief:</p>
        <p className="mt-3 font-mono text-[14.5px]">/lab/preview?language=&lt;id or slug&gt;&amp;brief=&lt;what the screen is for&gt;</p>
      </Bare>
    );
  }
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const [design, planned] = await Promise.all([getDesign("language", id, tier), planScreen(text)]);
  if (!design) {
    return (
      <Bare>
        <p>No language in view is called <span className="font-mono">{id}</span>.{tier === "sample" ? " Anonymous previews use the visitor shelf; sign in for the full library." : ""}</p>
      </Bare>
    );
  }
  const theme = themeFromTokens(design.id, design.name, design.tokens);
  const embedded = { language: { id: design.id, name: design.name, url: design.url }, brief: text, plan: planned.plan, model: planned.model, timings_ms: planned.timings_ms, theme, ...(planned.error ? { error: planned.error } : {}) };
  return (
    <>
      <ThemeFonts themes={[theme]} />
      <script id="katagami-preview" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(embedded).replace(/</g, "\\u003c") }} />
      <div style={{ minHeight: "100vh", background: theme.colors.bg }}>
        <Screen plan={planned.plan} theme={theme} brief={text} style={{ minHeight: "100vh" }} />
      </div>
    </>
  );
}
