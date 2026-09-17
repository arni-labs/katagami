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
  // Same authoring test encyclopedia_cell.cedar uses, and for the same reason:
  // `principal is Agent` was too narrow. The curation key's principal carries
  // agent_type without being an Agent entity, so that clause denied every one
  // of the 32 authoring calls while the identical key writes cells all day.
  // Test the attribute, not the entity type.
  principal is System ||
  principal is Admin ||
  (principal has agent_type &&
    ["operator", "curation-service"].contains(principal.agent_type)) ||
  (principal is Customer &&
    principal has role &&
    ["owner", "curator"].contains(principal.role))
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
