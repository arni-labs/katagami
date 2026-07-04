import Link from "next/link";

// A voice is prose, so the card is type-first: the name set large, the persona
// as the specimen line, tone chips, and the first refusal — "taste is what you
// reject" — instead of an image.
export interface WritingStyleItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  persona: string;
  /** The style's signature passage — shown in quotes on the card so the
   *  register is assessable at a glance. */
  signature: string;
  basis: string;
  tone: string[];
  refusal: string;
  tags: string[];
}

const BASIS_LABEL: Record<string, string> = {
  opt_in: "consented voice",
  public_domain: "public domain",
  original: "original register",
};

export function WritingStyleCard({ item }: { item: WritingStyleItem }) {
  return (
    <Link
      href={`/voice/${item.id}`}
      className="sticker-card group block p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {BASIS_LABEL[item.basis] ?? "voice"}
        </span>
        {item.tone[0] ? (
          <span className="font-mono text-[10px] text-muted-foreground/80">
            {item.tone[0]}
          </span>
        ) : null}
      </div>
      <h3
        className="mt-3 text-[26px] font-semibold leading-tight text-foreground"
        style={{ letterSpacing: "-0.02em" }}
      >
        {item.name}
      </h3>
      {item.signature ? (
        <blockquote className="mt-3 text-[16px] leading-relaxed text-foreground">
          &ldquo;{item.signature}&rdquo;
        </blockquote>
      ) : null}
      {item.persona ? (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          {item.persona}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        {item.tone.slice(1).map((t) => (
          <span
            key={t}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80"
          >
            {t}
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 transition-colors group-hover:text-foreground">
          read the contract →
        </span>
      </div>
    </Link>
  );
}
