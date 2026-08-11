// CuratorAgent — the synthesis-protocol record for one curator run (ARN-294).
// Open to the principals that already drive curation, matching CurationJob:
// the record is the run's own ledger, and the curator writes it as it works.
//
// The publish boundary is deliberately NOT restated here. This actor has no
// Publish action in its alphabet at all, and the artifact-side boundary stays
// where it already lives — katagami-commons/policies/design_language.cedar and
// art_style.cedar forbid contributor agents from Publish on the artifacts
// themselves. Nothing in this file grants anything those policies deny.
permit(
  principal,
  action,
  resource is CuratorAgent
);
