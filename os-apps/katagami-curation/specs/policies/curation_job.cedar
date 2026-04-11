// Katagami Curation Job — Cedar Policies
//
// Follows the koto-wiki WikiJob pattern. All agents involved in curation
// (bootstrap, curator) can create and manage jobs. The WASM integrations
// handle session spawning automatically.

// --- Universal: anyone can read, list, create ---

permit(
  principal,
  action in [Action::"create", Action::"read", Action::"list"],
  resource is CurationJob
);

// --- Job lifecycle: bootstrap and curator agents ---

permit(
  principal,
  action in [
    Action::"Configure",
    Action::"Submit",
    Action::"Start",
    Action::"SessionSpawned",
    Action::"RecordProgress",
    Action::"Complete",
    Action::"Fail"
  ],
  resource is CurationJob
) when {
  ["bootstrap", "curator"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};

// --- Fast-track: human/supervisor can manage any job ---

permit(
  principal,
  action in [
    Action::"Configure",
    Action::"Submit",
    Action::"Start",
    Action::"SessionSpawned",
    Action::"RecordProgress",
    Action::"Complete",
    Action::"Fail"
  ],
  resource is CurationJob
) when {
  ["supervisor", "human"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};
