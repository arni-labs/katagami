// CuratorAgent — expected curator conduct (ARN-294).
// Alphabet is the acts we expect: take the query, search, index, derive;
// take the direction, read design-language.md, author every named part,
// render, see each surface, fix, submit. Publish and quality-review
// completion are absent.
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
    Action::"ReadDesignRules",
    Action::"AuthorLanguage",
    Action::"RenderSurfaces",
    Action::"LookAtLanding",
    Action::"LookAtEmbodiment",
    Action::"LookAtDashboard",
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
