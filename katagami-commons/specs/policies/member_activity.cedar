// MemberActivityDay — per-user activity tallies (ARN-451). Written only by
// trusted server-side principals (the gallery's server routes via the platform
// key), same trust boundary as Member: a contributor agent or signed-in human
// must not be able to inflate or reset anyone's activity counts.
permit(principal, action, resource is MemberActivityDay);
forbid(principal, action, resource is MemberActivityDay)
unless { principal is System || principal is Admin || (principal has agent_type && principal.agent_type == "operator") };
