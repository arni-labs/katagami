import type { Metadata } from "next";
import { PageHero, Marker } from "@/components/page-hero";
import { AskLibrary } from "./ask-library";

export const metadata: Metadata = {
  title: "Ask the library — Katagami",
  description:
    "Describe what you are making in a sentence. Katagami reads every design language and art style and hands back the ones that fit — and a few you would not have searched for.",
};

export default function AskPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Ask"
        eyebrowAccent="sakura"
        title={
          <>
            Ask the <Marker color="yuzu">library</Marker>
          </>
        }
        description="Say what you are making, in a sentence. Every design language and art style is read against it — by judgment, not keywords."
      />
      <AskLibrary />
    </div>
  );
}
