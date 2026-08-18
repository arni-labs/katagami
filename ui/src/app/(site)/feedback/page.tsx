import { FeedbackQuestionnaire } from "./questionnaire";

// ARN-330: the launch feedback questionnaire. Answers land as
// FeedbackResponse entities in commons (stable option keys, see actions.ts).
// Viewer identity is read server-side inside the submit action, never here.

export const metadata = {
  title: "Feedback · Katagami",
  description:
    "Six quick taps. About ninety seconds. Tell us what Katagami should become.",
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
          Help shape Katagami
        </h1>
      </div>
      <div className="mt-10">
        <FeedbackQuestionnaire source={source} />
      </div>
    </div>
  );
}
