// STANCE: Owners and curation-service agents author and submit. System and the exact WASM runtime verify and publish.
permit(
  principal,
  action in [
    Action::"read",
    Action::"list"
  ],
  resource is NarrativeStructure
);

permit(
  principal,
  action in [
    Action::"create",
    Action::"Revise",
    Action::"Restore",
    Action::"SetEncyclopediaLinks",
    Action::"SetExemplars",
    Action::"SetIdentity",
    Action::"SetInstruction",
    Action::"SetMovements",
    Action::"SetSources",
    Action::"SubmitNarrativeStructure",
    Action::"Archive",
    Action::"SubmitForReview"
  ],
  resource is NarrativeStructure
) when {
  (principal is Agent &&
    principal has agent_type &&
    principal.agent_type == "curation-service") ||
  (principal is Customer &&
    principal has role &&
    principal.role == "owner")
};

// System and the exact WASM runtime may verify and publish. This permit also
// covers review submission, archival, and lifecycle events.
permit(
  principal,
  action in [
    Action::"Archive",
    Action::"MarkStructureVerified",
    Action::"Publish",
    Action::"SubmitForReview",
    Action::"NarrativeStructurePublishedEvent",
    Action::"NarrativeStructureArchivedEvent"
  ],
  resource is NarrativeStructure
) when {
  principal is System ||
  principal == Agent::"service:wasm-runtime"
};

// Cedar permits create and named transitions but denies generic update and
// delete requests.
