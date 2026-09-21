import { PageHero, Marker } from "@/components/page-hero";
import { SideBySide } from "./side-by-side";

// Lab prototype 2: one sentence, one screen, the top languages for it side by
// side. Unlisted; reachable only by URL.

export const dynamic = "force-dynamic";

export default function SideBySidePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Lab · same screen, several languages"
        eyebrowAccent="ramune"
        title={
          <>
            Choose by <Marker color="sakura">looking</Marker>
          </>
        }
        description="Say what you are making. The library is asked which languages fit (one model call) and the screen is planned (one more), then the same screen is rendered in each of the top four — so choosing is looking, not reading."
      />
      <SideBySide />
    </div>
  );
}
