// Katagami DesignSource — Cedar Policies
//
// Read access is universal. Source submission and indexing are done by the
// bootstrap agent. Both Indexed and Failed are terminal states.

// --- Universal: anyone can read, list, and query ---

permit(
  principal,
  action in [Action::"create", Action::"read", Action::"list"],
  resource is DesignSource
);

// --- Source management: bootstrap agent ---

permit(
  principal,
  action in [
    Action::"Submit",
    Action::"Index",
    Action::"IndexFailed"
  ],
  resource is DesignSource
) when {
  ["bootstrap"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};

// --- Fast-track: human/supervisor/curator can perform any action ---

permit(
  principal,
  action in [
    Action::"Submit",
    Action::"Index",
    Action::"IndexFailed"
  ],
  resource is DesignSource
) when {
  ["supervisor", "human", "curator"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};
