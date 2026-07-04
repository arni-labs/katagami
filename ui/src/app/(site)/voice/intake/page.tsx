import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isOwner } from "@/lib/owner";
import { PageHero, Marker } from "@/components/page-hero";
import { VoiceIntakeForm } from "@/components/voice-intake-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Find your style — Katagami" };

export default async function VoiceIntakePage() {
  if (!(await isOwner())) notFound();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <Link
        href="/voice"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to voices
      </Link>
      <PageHero
        eyebrow="Voice intake"
        eyebrowAccent="matcha"
        title={
          <>
            Find <Marker color="matcha">your</Marker> style
          </>
        }
        description="Bring 3-20 pieces of real writing. Consent is bound to the corpus the moment it enters; extraction derives the contract — tone, refusals, mechanical bands — from what you actually wrote, and nothing publishes without the curator."
      />
      <div className="mt-10">
        <VoiceIntakeForm />
      </div>
    </div>
  );
}
