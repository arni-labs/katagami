// CuratorAgent — expected curator conduct (ARN-294).
// Alphabet is the acts we expect: take the query, search, index, derive;
// take the direction, author, render, look, fix, submit. Publish and
// quality-review completion are absent.
permit(
  principal,
  action in [
    Action::"RecordCapture",
    Action::"TakeQuery",
    Action::"SearchTheWeb",
    Action::"IndexSources",
    Action::"DeriveDirections",
    Action::"CompleteResearch",
    Action::"TakeDirection",
    Action::"AuthorLanguage",
    Action::"AuthorSurfaces",
    Action::"RenderSurfaces",
    Action::"LookAtRenders",
    Action::"FixSurfaces",
    Action::"SubmitLanguage",
    Action::"CompleteSynthesis",
    Action::"Abandon"
  ],
  resource is CuratorAgent
);

forbid(
  principal,
  action,
  resource is CuratorAgent
) when { principal.id == "anonymous" };
