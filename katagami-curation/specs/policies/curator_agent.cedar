// CuratorAgent — the synthesis-protocol record for one curator run (ARN-294).
// Open to the principals that already drive curation, matching CurationJob:
// the record is the run's own ledger, and the curator writes it as it works.
//
// The publish boundary is deliberately NOT restated here. This actor has no
// Publish action in its alphabet at all, and the artifact-side boundary stays
// where it already lives — katagami-commons/policies/design_language.cedar and
// art_style.cedar forbid contributor agents from Publish on the artifacts
// themselves. Nothing in this file grants anything those policies deny.
// The permit ENUMERATES the alphabet rather than granting `action`, so an
// action added to curator_agent.ioa.toml later arrives denied and has to be
// admitted here deliberately. CuratorSubmittedEvent is absent on purpose: it
// is an output action, emitted by the platform, never invoked by a caller.
permit(
  principal,
  action in [
    Action::"RecordBriefRef",
    Action::"AcceptBrief",
    Action::"ReadSiblingMechanics",
    Action::"ReadReturnedCritique",
    Action::"DeriveDirection",
    Action::"ClaimJob",
    Action::"ReleaseJob",
    Action::"GenerateImagery",
    Action::"InspectImagery",
    Action::"AuthorSurfaces",
    Action::"RenderSurfaces",
    Action::"InspectRender",
    Action::"ReadFilmstrip",
    Action::"TraverseScroll",
    Action::"VerifyHeroReplaceable",
    Action::"VerifyAgainstRules",
    Action::"RecordRuleFailure",
    Action::"OpenLivePage",
    Action::"RecordCraftFix",
    Action::"DeclareCraftClean",
    Action::"SelfReview",
    Action::"ReopenAfterSelfReview",
    Action::"SubmitDesignLanguage",
    Action::"Abandon"
  ],
  resource is CuratorAgent
);

// An unauthenticated caller is nobody. `anonymous` is the principal id the
// platform assigns when no identity was presented (temper-authz
// SecurityContext::from_headers), and a run ledger with nobody attached to it
// is not a run ledger.
forbid(
  principal,
  action,
  resource is CuratorAgent
) when { principal.id == "anonymous" };
