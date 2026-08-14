import { FeedbackQuestionnaire } from "./questionnaire";

// ARN-330: the launch feedback questionnaire — 90 seconds, tap-only, every
// question skippable. Answers land as FeedbackResponse entities in commons
// (stable option keys, see actions.ts). Static page: viewer identity is read
// server-side inside the submit action, never here.

export const metadata = {
  title: "Feedback — Katagami",
  description:
    "Ninety seconds, no typing required — tell us what Katagami should become.",
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const source =
    from === "launch-banner" || from === "footer" ? from : "direct";
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:pt-16">
      <div className="mx-auto max-w-xl">
        <p className="stamp text-[var(--sakura)]">feedback</p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.02em]">
          Help shape the library
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
          Six quick questions, about ninety seconds — only the last one is
          free-form, and it&rsquo;s optional.
        </p>
      </div>
      <div className="mt-12">
        <FeedbackQuestionnaire source={source} />
      </div>
    </div>
  );
}
