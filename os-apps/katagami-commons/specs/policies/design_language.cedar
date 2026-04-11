// Katagami Design Language — Cedar Policies
//
// Read access is universal. Spec authoring is done by bootstrap/curator agents.
// Publishing and archiving require curator or human approval.

// --- Universal: anyone can read, list, and query ---

permit(
  principal,
  action in [Action::"create", Action::"read", Action::"list"],
  resource is DesignLanguage
);

// --- Spec authoring: bootstrap and curator agents ---

permit(
  principal,
  action in [
    Action::"SetName",
    Action::"WritePhilosophy",
    Action::"SetTokens",
    Action::"SetRules",
    Action::"SetLayout",
    Action::"SetGuidance",
    Action::"AttachEmbodiment",
    Action::"AttachThumbnail",
    Action::"SetTaxonomy",
    Action::"SetTags",
    Action::"SetSources",
    Action::"SetLineage",
    Action::"SubmitForReview",
    Action::"UpdateQuality",
    Action::"IncrementUsage",
    Action::"IncrementFork"
  ],
  resource is DesignLanguage
) when {
  ["bootstrap", "curator"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};

// --- Publishing and archiving: curator or human ---

permit(
  principal,
  action in [Action::"Publish", Action::"Revise", Action::"Archive"],
  resource is DesignLanguage
) when {
  ["curator", "human"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};

// --- Fast-track: human/supervisor can perform any action ---

permit(
  principal,
  action in [
    Action::"SetName",
    Action::"WritePhilosophy",
    Action::"SetTokens",
    Action::"SetRules",
    Action::"SetLayout",
    Action::"SetGuidance",
    Action::"AttachEmbodiment",
    Action::"AttachThumbnail",
    Action::"SetTaxonomy",
    Action::"SetTags",
    Action::"SetSources",
    Action::"SetLineage",
    Action::"SubmitForReview",
    Action::"Publish",
    Action::"Revise",
    Action::"Archive",
    Action::"UpdateQuality",
    Action::"IncrementUsage",
    Action::"IncrementFork"
  ],
  resource is DesignLanguage
) when {
  ["supervisor", "human"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};
