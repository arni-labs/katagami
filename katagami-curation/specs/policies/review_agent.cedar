// ReviewAgent — one machine review of one curator submission (ARN-294).
permit(
  principal,
  action,
  resource is ReviewAgent
);

// A contributor never rules on its own work. Contributor principals author
// submissions (katagami-commons/policies/design_language.cedar, art_style.cedar);
// recording the verdict that unlocks the human publish path is a separate
// principal's job, so an agent cannot rubber-stamp itself through this record.
forbid(
  principal,
  action in [Action::"RecordVerdict", Action::"RecordFinding"],
  resource is ReviewAgent
) when { principal has agent_type && principal.agent_type == "contributor" };
