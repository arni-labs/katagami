import { parseJson } from "@/lib/odata";
import { StickyNote } from "@/components/scrapbook";

type PortabilityCase = {
  style_reference_used?: boolean;
};

type PortabilityModel = {
  provider?: string;
  model?: string;
  cases?: PortabilityCase[];
};

type PortabilityReport = {
  verdict?: string;
  blind_evaluation?: boolean;
  models?: PortabilityModel[];
};

type PromptReview = {
  verdict?: string;
  reference_independent?: boolean;
  model_agnostic?: boolean;
};

type SourceBasis = {
  verdict?: string;
  sources?: Array<{ kind?: string }>;
};

export function ArtStyleEvidence({
  portabilityRaw,
  promptReviewRaw,
  sourceBasisRaw,
  attested = false,
}: {
  portabilityRaw?: string;
  promptReviewRaw?: string;
  sourceBasisRaw?: string;
  attested?: boolean;
}) {
  const portability = parseJson<PortabilityReport>(portabilityRaw);
  const promptReview = parseJson<PromptReview>(promptReviewRaw);
  const sourceBasis = parseJson<SourceBasis>(sourceBasisRaw);
  const models = portability?.models?.filter((entry) => entry.model && entry.provider) ?? [];

  if (!attested || !portability || portability.verdict !== "pass") {
    return (
      <StickyNote className="p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Portability evidence
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          Legacy catalog record — its prompt and existing images have not yet passed the
          cross-model, prompt-only portability gate.
        </p>
      </StickyNote>
    );
  }

  const caseCount = models.reduce((sum, model) => sum + (model.cases?.length ?? 0), 0);
  const usesStyleReference = models.some((model) =>
    model.cases?.some((testCase) => testCase.style_reference_used),
  );

  return (
    <StickyNote tint="matcha" className="p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Verified portability
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-foreground">
        The same prompt passed {caseCount} blind-scored edits across {models.length} image
        models{usesStyleReference ? "." : ", without style-reference images."}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {models.map((model) => (
          <span
            key={`${model.provider}/${model.model}`}
            className="font-mono text-[10px] text-muted-foreground"
          >
            {model.provider} · {model.model} · {model.cases?.length ?? 0} cases
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        prompt review {promptReview?.verdict === "pass" && promptReview.reference_independent && promptReview.model_agnostic ? "passed" : "unverified"}
        {" · "}
        source/rights review {sourceBasis?.verdict === "pass" ? "passed" : "unverified"}
        {sourceBasis?.sources?.length ? ` · ${sourceBasis.sources.length} source basis` : ""}
        {portability.blind_evaluation ? " · blind evaluation" : ""}
      </p>
    </StickyNote>
  );
}
