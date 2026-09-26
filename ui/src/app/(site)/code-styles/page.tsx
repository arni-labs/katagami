import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { CodeStyles } from "./code-styles";

// Owner-only while the first styles are reviewed: not in header-nav, mobile-nav or search, and
// the modules it loads (ui/code-styles, served by ./[...path]/route.ts) are behind the same check.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Code styles · katagami",
  description:
    "Art styles written as programs. Each one makes the picture the way its medium is made, on any subject, and keeps the rules of its tradition.",
  robots: { index: false, follow: false },
};

export default async function CodeStylesPage() {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:pt-14">
      <PageHero
        eyebrow="Code styles"
        eyebrowAccent="sakura"
        title="Drawn the way it is made"
        description="Each style is a small program that re-enacts its medium: the knife through paper, the drum laying one ink at a time, the gold along a crack. Give it any subject, watch it being made, then play with the finished piece."
      />
      <CodeStyles />
    </main>
  );
}
