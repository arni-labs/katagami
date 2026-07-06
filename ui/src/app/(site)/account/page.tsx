import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut, Palette } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { getUser } from "@/lib/user-auth";
import {
  listArtStyles,
  listDesignLanguages,
  listPaletteSystems,
  listRemixes,
} from "@/lib/odata";
import { Marker, PageHero } from "@/components/page-hero";
import { SectionHeading, StickyNote, WashiTape } from "@/components/scrapbook";
import { UserAvatar } from "@/components/user-menu";
import { KX_BTN_PAPER } from "@/lib/katagami-ui";
import SubmissionsSection from "./submissions-section";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account — Katagami",
  description: "Your Katagami identity and the mixes you saved.",
};

const COMP_NAME: Record<string, string> = {
  "compositions.landing": "Landing",
  "compositions.dashboard": "Dashboard",
};

type MixRow = {
  id: string;
  language: string;
  palette: string;
  art: string;
  composition: string;
  rating: number;
};

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/signin?next=/account");

  // Reads are catalog-wide and filtered here in app code on purpose: OData
  // projected reads can silently omit entities (ARN-97), and creator fields
  // only exist on post-attribution remixes.
  const [remixes, languages, palettes, artStyles] = await Promise.all([
    listRemixes("Status eq 'Saved'").catch(() => []),
    listDesignLanguages("Status eq 'Published'").catch(() => []),
    listPaletteSystems().catch(() => []),
    listArtStyles().catch(() => []),
  ]);

  const nameOf = (
    lane: { entity_id: string; fields: Record<string, string | undefined> }[],
    id: string,
  ) => lane.find((e) => e.entity_id === id)?.fields.name ?? "—";

  const mine: MixRow[] = remixes
    .filter((r) => (r.fields.creator_sub ?? "") === user.sub)
    .map((r) => ({
      id: r.entity_id,
      language: nameOf(languages, r.fields.design_language_id ?? ""),
      palette: nameOf(palettes, r.fields.palette_system_id ?? ""),
      art: nameOf(artStyles, r.fields.art_style_id ?? ""),
      composition:
        COMP_NAME[r.fields.composition_key ?? ""] ??
        (r.fields.composition_key || "—"),
      rating: Number(r.fields.rating ?? r.fields.Rating ?? 0),
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to gallery
      </Link>

      <PageHero
        eyebrow={
          <>
            <span>your account</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              signed in with Google
            </span>
          </>
        }
        eyebrowAccent="teal"
        title={
          <>
            Hello, <Marker color="teal">{firstName(user.name, user.email)}</Marker>
          </>
        }
        description="This is everything Katagami knows about you: who you are, and the mixes you saved. No more, by design."
        rightSlot={<span className="stamp text-[var(--teal)]">signed in</span>}
      />

      <section className="relative">
        <WashiTape color="teal" rotate={-4} className="-left-3 -top-3" width={86} />
        <StickyNote className="p-5 sm:p-6">
          <SectionHeading eyebrow="identity" eyebrowColor="teal">
            <Marker color="teal">Who you are here</Marker>
          </SectionHeading>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <UserAvatar user={user} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold leading-tight text-foreground">
                {user.name || user.email}
              </p>
              <p className="mt-0.5 font-mono text-[12px] lowercase tracking-[0.04em] text-muted-foreground">
                {user.email}
              </p>
            </div>
            <form action={signOut}>
              <button className={KX_BTN_PAPER}>
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                sign out
              </button>
            </form>
          </div>
        </StickyNote>
      </section>

      <section className="relative">
        <WashiTape color="sakura" rotate={3} className="-right-3 -top-3" width={94} />
        <StickyNote className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeading eyebrow="your work" eyebrowColor="sakura">
              <Marker color="sakura">Saved mixes</Marker>
            </SectionHeading>
            <span className="stamp text-[var(--sakura)]">
              {mine.length} {mine.length === 1 ? "mix" : "mixes"}
            </span>
          </div>

          {mine.length > 0 ? (
            <div className="mt-5 space-y-2.5">
              {mine.map((m) => (
                <article
                  key={m.id}
                  className="flex flex-col gap-1.5 bg-background/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-foreground">
                      {m.language} · {m.palette} · {m.art}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {m.composition}
                      {m.rating > 0 ? ` · rated ${m.rating}/5` : " · unrated"}
                    </p>
                  </div>
                  <Link
                    href="/studio"
                    className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[color-mix(in_oklch,var(--teal)_72%,var(--foreground))] transition-colors hover:text-foreground"
                  >
                    open in studio →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Nothing saved yet. Mix a language, a palette, and an art style —
                then save it here under your name.
              </p>
              <Link href="/studio" className={KX_BTN_PAPER}>
                <Palette className="h-3.5 w-3.5" aria-hidden />
                open the studio
              </Link>
            </div>
          )}
        </StickyNote>
      </section>

      <SubmissionsSection sub={user.sub} />
    </div>
  );
}

function firstName(name: string, email: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || email.split("@")[0];
}
