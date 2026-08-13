// CuratorAgent — one curator principal on the live pipeline (ARN-294).
// The permit enumerates the alphabet. Publish and quality-review completions
// are absent on purpose. Artifact-side publish stays forbidden in
// katagami-commons/policies/design_language.cedar.
permit(
  principal,
  action in [
    Action::"RecordCapture",
    Action::"AcceptResearchJob",
    Action::"AcceptSynthesizeJob",
    Action::"RecordResearchQuery",
    Action::"RecordDirectionSpawned",
    Action::"FinishResearch",
    Action::"RecordSynthesizeQuery",
    Action::"RecordDirection",
    Action::"RecordLanguage",
    Action::"RecordLook",
    Action::"RecordSynthesizeFix",
    Action::"FinishSynthesize",
    Action::"Abandon"
  ],
  resource is CuratorAgent
);

forbid(
  principal,
  action,
  resource is CuratorAgent
) when { principal.id == "anonymous" };
