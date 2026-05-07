import Link from "next/link";
import { ArrowLeft, KeyRound, Lock, Unlock } from "lucide-react";
import { lockOwnerMode, unlockOwnerMode } from "@/app/actions";
import { isOwner, isOwnerModeConfigured } from "@/lib/owner";
import {
  Marker,
  PageHero,
} from "@/components/page-hero";
import {
  SectionHeading,
  StickyNote,
  WashiTape,
} from "@/components/scrapbook";

const errorCopy: Record<string, string> = {
  "bad-passphrase": "That passphrase did not unlock owner mode.",
  "not-configured": "Set KATAGAMI_OWNER_SECRET on the server first.",
};

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    locked?: string;
    unlocked?: string;
  }>;
}) {
  const [sp, owner, configured] = await Promise.all([
    searchParams,
    isOwner(),
    Promise.resolve(isOwnerModeConfigured()),
  ]);
  const error = sp.error ? errorCopy[sp.error] : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-10">
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
            <span>private controls</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              owner mode
            </span>
          </>
        }
        eyebrowAccent="sumire"
        title={<Marker color={owner ? "salad" : "sumire"}>Owner mode</Marker>}
        description={
          <>
            Unlock this browser to reveal destructive curator controls in the
            gallery and language detail pages. The server still checks owner
            mode before it deletes anything.
          </>
        }
        rightSlot={
          <span
            className={`stamp ${
              owner ? "text-[var(--salad)]" : "text-[var(--sumire)]"
            }`}
          >
            {owner ? "unlocked" : "locked"}
          </span>
        }
      />

      <section className="relative">
        <WashiTape
          color={owner ? "salad" : "sumire"}
          rotate={-4}
          className="-left-3 -top-3"
          width={86}
        />
        <StickyNote className="p-5 sm:p-6">
          <SectionHeading
            eyebrow={owner ? "session active" : "unlock"}
            eyebrowColor={owner ? "salad" : "sumire"}
          >
            <Marker color={owner ? "salad" : "sumire"}>
              {owner ? "delete controls are visible" : "enter passphrase"}
            </Marker>
          </SectionHeading>

          {owner ? (
            <div className="space-y-5">
              {sp.unlocked ? (
                <p className="text-sm text-muted-foreground">
                  Owner mode is active in this browser.
                </p>
              ) : null}
              <form action={lockOwnerMode}>
                <button className="inline-flex h-9 items-center gap-1.5 border border-border bg-card/70 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  lock owner mode
                </button>
              </form>
            </div>
          ) : (
            <form action={unlockOwnerMode} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="owner-passphrase"
                  className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  owner passphrase
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <span className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="owner-passphrase"
                      name="passphrase"
                      type="password"
                      autoComplete="current-password"
                      disabled={!configured}
                      className="h-10 w-full min-w-0 rounded-[4px] border border-border bg-background/70 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sumire)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={
                        configured
                          ? "Only the owner knows this"
                          : "Set KATAGAMI_OWNER_SECRET first"
                      }
                    />
                  </span>
                  <button
                    disabled={!configured}
                    className="inline-flex h-10 items-center justify-center gap-1.5 border border-border bg-card/70 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    unlock
                  </button>
                </div>
              </div>
              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}
              {sp.locked ? (
                <p className="text-sm text-muted-foreground">
                  Owner mode is locked for this browser.
                </p>
              ) : null}
            </form>
          )}
        </StickyNote>
      </section>
    </div>
  );
}
