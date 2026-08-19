import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import {
  listDesignLanguages,
  listFeaturedDesignLanguages,
  type DesignLanguage,
} from "@/lib/odata";
import { isOwner } from "@/lib/owner";
import { Marker, PageHero } from "@/components/page-hero";
import { SectionHeading, StickyNote, WashiTape } from "@/components/scrapbook";
import { VisitorShelfPicker } from "./shelf-picker";

function languageName(lang: DesignLanguage): string {
  return lang.fields.name || lang.fields.slug || lang.entity_id;
}

function displayOrderOf(lang: DesignLanguage): number {
  const raw =
    lang.counters?.display_order ??
    lang.fields.display_order ??
    lang.fields.displayOrder;
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export default async function VisitorShelfPage() {
  if (!(await isOwner())) {
    redirect("/owner");
  }

  const [featured, published] = await Promise.all([
    listFeaturedDesignLanguages(),
    listDesignLanguages("Status eq 'Published'"),
  ]);
  const featuredIds = new Set(featured.map((l) => l.entity_id));
  const catalog = published
    .filter((l) => l.fields.name && !featuredIds.has(l.entity_id))
    .sort((a, b) => languageName(a).localeCompare(languageName(b)));

  const rows = {
    featured: featured.map((l) => ({
      id: l.entity_id,
      name: languageName(l),
      slug: l.fields.slug ?? "",
      featured: true,
      displayOrder: displayOrderOf(l),
    })),
    catalog: catalog.map((l) => ({
      id: l.entity_id,
      name: languageName(l),
      slug: l.fields.slug ?? "",
      featured: false,
      displayOrder: displayOrderOf(l),
    })),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-10">
      <Link
        href="/owner"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        owner mode
      </Link>

      <PageHero
        eyebrow={
          <>
            <span>visitor home</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              owner pick
            </span>
          </>
        }
        eyebrowAccent="yuzu"
        title={<Marker color="yuzu">Who sees what before sign-in</Marker>}
        description={
          <>
            People who are not logged in only see this set. Nothing else
            fills in. Add or remove languages here, or use{" "}
            <strong>Visitor home</strong> on a gallery card while signed in
            as owner.
          </>
        }
      />

      <section className="relative">
        <WashiTape color="yuzu" rotate={-3} className="-left-3 -top-3" width={90} />
        <StickyNote className="p-5 sm:p-6">
          <SectionHeading eyebrow="how to pick" eyebrowColor="yuzu">
            <Marker color="yuzu">The visitor shelf</Marker>
          </SectionHeading>
          <ol className="mt-3 max-w-2xl list-decimal space-y-2 pl-5 text-[17px] leading-relaxed text-foreground">
            <li>Sign in with the owner Google account.</li>
            <li>
              Open this page from Owner mode, or stay on the signed-in
              gallery and tap <strong>Visitor home</strong> on a card.
            </li>
            <li>
              Only languages in the list below appear at katagami.ai for
              people who are not signed in.
            </li>
          </ol>
        </StickyNote>
      </section>

      <VisitorShelfPicker featured={rows.featured} catalog={rows.catalog} />
    </div>
  );
}
