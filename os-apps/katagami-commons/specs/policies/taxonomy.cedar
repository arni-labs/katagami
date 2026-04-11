// Katagami Taxonomy — Cedar Policies
//
// Read access is universal. Taxonomy management is done by curator agents.
// Publishing and archiving require curator or human approval.

// --- Universal: anyone can read, list, and query ---

permit(
  principal,
  action in [Action::"create", Action::"read", Action::"list"],
  resource is Taxonomy
);

// --- Taxonomy management: curator agents ---

permit(
  principal,
  action in [
    Action::"Define",
    Action::"Publish",
    Action::"UpdateCharacteristics",
    Action::"UpdateRelations",
    Action::"IncrementLanguageCount",
    Action::"Archive"
  ],
  resource is Taxonomy
) when {
  ["curator"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};

// --- Fast-track: human/supervisor can perform any action ---

permit(
  principal,
  action in [
    Action::"Define",
    Action::"Publish",
    Action::"UpdateCharacteristics",
    Action::"UpdateRelations",
    Action::"IncrementLanguageCount",
    Action::"Archive"
  ],
  resource is Taxonomy
) when {
  ["supervisor", "human"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};
