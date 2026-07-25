// Katagami Curation Job — Cedar Policies
//
// Follows the koto-wiki WikiJob pattern. All agents involved in curation
// (bootstrap, curator) can create and manage jobs. The WASM integrations
// handle session spawning automatically.

// Katagami Curation Job — Cedar Policies
//
// All principals can manage curation jobs. The job pipeline is the
// primary interface for both humans (via API) and agents (via sessions).

permit(
  principal,
  action,
  resource is CurationJob
);

// Contributor agents and signed-in humans do not drive curation (ARN-255): the
// pipeline and curators run it through server-side principals. Without this the
// base permit let any verified contributor or human accept taste rules, queue
// jobs, or rewrite directions. Curators act through the katagami.ai server,
// which carries the operator credential. Reads stay open.
forbid(principal, action, resource is CurationJob)
unless { action == Action::"read" || principal is System || principal is Admin || (principal has agent_type && ["operator", "curation-service", "wasm-module", "service:wasm-runtime"].contains(principal.agent_type)) || (principal is Customer && principal has role && ["owner", "curator"].contains(principal.role)) };
