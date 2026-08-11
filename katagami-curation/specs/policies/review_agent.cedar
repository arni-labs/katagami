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

// The review verdict is the reviewer's, and the reviewer is a named principal.
// Forbidding contributors alone left every other authenticated principal —
// another lane's agent, an admin, an unrelated service — able to record the
// verdict that unlocks publishing. This is the allowlist:
//
//   Agent::"katagami-reviewer"  the review role's own credential
//   Agent::"system"             the pipeline finalizer, as on ArtStyle
//                               (katagami-commons/policies/art_style.cedar)
//
// Adding a reviewer means adding it here, in review, rather than it appearing
// by default.
forbid(
  principal,
  action in [Action::"RecordVerdict", Action::"RecordFinding"],
  resource is ReviewAgent
) unless {
  principal == Agent::"katagami-reviewer" ||
  principal == Agent::"system"
};

// An unauthenticated caller is nobody. `anonymous` is the principal id the
// platform assigns when no identity was presented (temper-authz
// SecurityContext::from_headers).
forbid(
  principal,
  action,
  resource is ReviewAgent
) when { principal.id == "anonymous" };
