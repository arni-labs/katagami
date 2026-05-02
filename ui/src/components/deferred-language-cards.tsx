"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignLanguage } from "@/lib/odata";
import { LanguageCard } from "@/components/language-card";

const ROOT_MARGIN = "600px";

export function DeferredLanguageCards({ langs }: { langs: DesignLanguage[] }) {
  return (
    <>
      {langs.map((lang) => (
        <DeferredCard key={lang.entity_id} lang={lang} />
      ))}
    </>
  );
}

function DeferredCard({ lang }: { lang: DesignLanguage }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  if (visible) return <LanguageCard lang={lang} />;
  return (
    <div
      ref={ref}
      className="h-72 rounded-[var(--radius-xl)] border border-border bg-muted/30"
      aria-hidden
    />
  );
}
