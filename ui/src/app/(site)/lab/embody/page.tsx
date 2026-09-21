import Link from "next/link";
import { PageHero, Marker } from "@/components/page-hero";
import { visibleLanguages } from "@/lib/genui/languages";

// Lab prototype 1, the door: pick a language to try on your own product.
// Unlisted; reachable only by URL.

export const dynamic = "force-dynamic";

export default async function EmbodyIndex() {
  const { tier, languages } = await visibleLanguages();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Lab · live embodiment"
        eyebrowAccent="sakura"
        title={
          <>
            Try a language on <Marker color="yuzu">your</Marker> product
          </>
        }
        description={`Pick a language, then say what screen you want. One model call chooses from a fixed catalogue; the screen renders in that language's real tokens. ${languages.length} languages in view (${tier} tier).`}
      />
      <ul className="mt-10 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {languages.map((l) => (
          <li key={l.id}>
            <Link href={`/lab/embody/${l.id}`} className="ink-underline text-[17px]">
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
