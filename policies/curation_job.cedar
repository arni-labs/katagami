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
