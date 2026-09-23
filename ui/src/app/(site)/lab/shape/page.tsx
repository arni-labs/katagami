import { PageHero, Marker } from "@/components/page-hero";
import { Shape } from "./shape";

// Lab prototype 4: an Ask whose result area takes the shape of the question.
// Unlisted; reachable only by URL.

export const dynamic = "force-dynamic";

export default function ShapePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Lab · the answer takes shape"
        eyebrowAccent="yuzu"
        title={
          <>
            Ask, and the page <Marker color="sakura">reshapes</Marker>
          </>
        }
        description="One model call reads what kind of question it is — find, compare, colours, or browse — and the results are laid out in that shape instead of always as a list."
      />
      <Shape />
    </div>
  );
}
