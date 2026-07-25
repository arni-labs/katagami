// CurationJobTemplate - open access for local development.

permit(
  principal,
  action,
  resource is CurationJobTemplate
);

// Contributor agents and signed-in humans do not drive curation (ARN-255): the
// pipeline and curators run it through server-side principals. Without this the
// base permit let any verified contributor or human accept taste rules, queue
// jobs, or rewrite directions. Curators act through the katagami.ai server,
// which carries the operator credential. Reads stay open.
forbid(principal, action, resource is CurationJobTemplate)
when { (principal has agent_type && principal.agent_type == "contributor") || principal is Customer }
unless { action == Action::"read" };
