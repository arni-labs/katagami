import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL, FEEDBACK_PATH, LEGAL_LAST_UPDATED } from "@/lib/legal";

/** The shared frame for the privacy policy, terms and support page. */
export function LegalPage({ title, updated = true, children }: { title: string; updated?: boolean; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-16 pt-12 sm:pb-20 sm:pt-20">
      <h1 className="font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[52px]">{title}</h1>
      {updated ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Last updated {LEGAL_LAST_UPDATED}</p>
      ) : null}
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[24px] font-bold tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 flex flex-col gap-4 text-[17px] leading-relaxed">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** How to reach a person: the support address once it exists, the feedback form until then. */
export function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="ink-underline">{CONTACT_EMAIL}</a>
  ) : (
    <Link href={FEEDBACK_PATH} className="ink-underline">the feedback form</Link>
  );
}
