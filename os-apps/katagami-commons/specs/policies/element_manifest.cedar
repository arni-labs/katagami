// Katagami ElementManifest — Cedar Policies
//
// Read access is universal. Manifest management (defining elements,
// activating versions) is restricted to curator/supervisor roles.
// Superseded is a terminal state.

// --- Universal: anyone can read, list, and query ---

permit(
  principal,
  action in [Action::"create", Action::"read", Action::"list"],
  resource is ElementManifest
);

// --- Manifest management: curator agents ---

permit(
  principal,
  action in [
    Action::"SetElements",
    Action::"SetCompositions",
    Action::"Activate",
    Action::"Supersede"
  ],
  resource is ElementManifest
) when {
  ["curator"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};

// --- Fast-track: human/supervisor can perform any action ---

permit(
  principal,
  action in [
    Action::"SetElements",
    Action::"SetCompositions",
    Action::"Activate",
    Action::"Supersede"
  ],
  resource is ElementManifest
) when {
  ["supervisor", "human"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};
