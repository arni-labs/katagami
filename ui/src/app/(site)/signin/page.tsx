import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Palette, Star, UserRound } from "lucide-react";
import { getUser, isAuthConfigured, safeInternalPath } from "@/lib/user-auth";
import { Marker, PageHero } from "@/components/page-hero";
import { SectionHeading, StickyNote, WashiTape } from "@/components/scrapbook";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — Katagami",
  description:
    "Sign in with Google to save mixes in the Remix Studio and put your name on your work.",
};

const errorCopy: Record<string, string> = {
  state: "That sign-in attempt expired or didn't come back intact. Try again.",
  google: "Google didn't confirm that sign-in. Try again.",
  config:
    "Sign-in isn't configured on this server yet — the Google client and session secret are missing.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeInternalPath(sp.next);
  const user = await getUser();
  if (user) redirect(next === "/" ? "/account" : next);

  const configured = isAuthConfigured();
  const error = sp.error
    ? (errorCopy[sp.error] ?? errorCopy.google)
    : undefined;

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
            <span>for humans</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              one click, no passwords
            </span>
          </>
        }
        eyebrowAccent="teal"
        title={
          <>
            Bring <Marker color="teal">your taste</Marker>
          </>
        }
        description={
          <>
            The gallery is open to everyone. Signing in gives your work a name:
            mixes you save in the Studio are yours, and your ratings teach the
            commons what good looks like.
          </>
        }
        rightSlot={<span className="stamp text-[var(--teal)]">humans only</span>}
      />

      <section className="relative">
        <WashiTape color="teal" rotate={-4} className="-left-3 -top-3" width={86} />
        <StickyNote className="p-5 sm:p-6">
          <SectionHeading eyebrow="sign in" eyebrowColor="teal">
            <Marker color="teal">Continue with Google</Marker>
          </SectionHeading>

          <div className="mt-5 space-y-4">
            {configured ? (
              <a
                href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
                className="inline-flex h-12 items-center justify-center gap-3 bg-card px-6 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-foreground shadow-[0_2px_0_rgba(30,35,45,0.12)] transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-1deg]"
              >
                <GoogleG />
                continue with Google
              </a>
            ) : (
              <span className="inline-flex h-12 cursor-not-allowed items-center justify-center gap-3 bg-card px-6 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-foreground opacity-50 shadow-none">
                <GoogleG />
                continue with Google
              </span>
            )}

            {error ? (
              <p className="text-sm font-medium text-destructive">{error}</p>
            ) : null}

            {!configured ? (
              <p className="text-sm text-muted-foreground">
                Set <code className="font-mono text-[12px]">GOOGLE_CLIENT_ID</code>,{" "}
                <code className="font-mono text-[12px]">GOOGLE_CLIENT_SECRET</code>, and{" "}
                <code className="font-mono text-[12px]">KATAGAMI_AUTH_SECRET</code>{" "}
                on the server first.
              </p>
            ) : null}

            <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
              We keep your name, email, and avatar in a signed cookie in this
              browser — nothing more, no password, no tracking. Sign out any
              time from the header.
            </p>
          </div>
        </StickyNote>
      </section>

      <section className="relative">
        <WashiTape color="yuzu" rotate={3} className="-right-3 -top-3" width={94} />
        <StickyNote className="p-5 sm:p-6">
          <SectionHeading eyebrow="the account" eyebrowColor="yuzu">
            <Marker color="yuzu">Three things, nothing else</Marker>
          </SectionHeading>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <PerkCard
              icon={<Palette className="h-4 w-4" aria-hidden />}
              title="Save your mixes"
              body="Keep the language + palette + art style combinations you make in the Remix Studio."
            />
            <PerkCard
              icon={<UserRound className="h-4 w-4" aria-hidden />}
              title="Your name on your work"
              body="Saved mixes carry your identity — the first step toward human contributions with credit."
            />
            <PerkCard
              icon={<Star className="h-4 w-4" aria-hidden />}
              title="Teach the taste loop"
              body="Rating your mixes feeds the taste signal that curates the whole commons."
            />
          </div>
        </StickyNote>
      </section>
    </div>
  );
}

function PerkCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="bg-background/70 p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-2 text-[color-mix(in_oklch,var(--teal)_72%,var(--foreground))]">
        {icon}
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

/** The four-color Google "G" — inline so the button stays self-contained. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-[18px] w-[18px] shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
