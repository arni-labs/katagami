// Katagami DesignElement — Cedar Policies
//
// Read access is universal. Element rendering and verification are done by
// bootstrap/curator agents. Verified is a terminal state.

// --- Universal: anyone can read, list, and query ---

permit(
  principal,
  action in [Action::"create", Action::"read", Action::"list"],
  resource is DesignElement
);

// --- Element management: bootstrap and curator agents ---

permit(
  principal,
  action in [
    Action::"Configure",
    Action::"Render",
    Action::"Verify",
    Action::"RejectRender",
    Action::"Rerender"
  ],
  resource is DesignElement
) when {
  ["bootstrap", "curator"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};

// --- Fast-track: human/supervisor can perform any action ---

permit(
  principal,
  action in [
    Action::"Configure",
    Action::"Render",
    Action::"Verify",
    Action::"RejectRender",
    Action::"Rerender"
  ],
  resource is DesignElement
) when {
  ["supervisor", "human"].contains(principal.agent_type) &&
  context.agentTypeVerified == true
};
