import Link from "next/link";

// Shown when a page under the site calls notFound(): a style that does not
// exist, or one a signed-out visitor may not see. It used to render nothing
// between the header and footer, so a person following a DESIGN.md's link to
// its paired art style landed on a blank page. The two cases cannot be told
// apart here without leaking which private entries exist, so the page says both.

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-12 sm:pb-20 sm:pt-20">
      <h1 className="font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[52px]">
        Not available here
      </h1>
      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed">
        This style either does not exist or is not open to signed-out visitors. Part of the library is open to everyone;
        signing in with Google opens the rest.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/signin"
          className="bg-foreground px-7 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-transform hover:-translate-y-[2px] motion-reduce:transition-none"
        >
          Sign in
        </Link>
        <Link
          href="/"
          className="bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))] px-7 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))] transition-transform hover:-translate-y-[2px] motion-reduce:transition-none"
        >
          Browse the library
        </Link>
      </div>
    </div>
  );
}
