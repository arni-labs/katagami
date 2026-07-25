// WritingStyle — open access for local development
permit(principal, action, resource is WritingStyle);

// Contributor boundary (ARN-151): agents submit, humans/pipeline publish.
// AttestConsent and MarkBandsSelfConsistent are verifier-owned gates (RFC-0002)
// — a contributor attesting its own consent claim would hollow out the lane.
forbid(
  principal,
  action in [
    Action::"Publish", Action::"Revise", Action::"Archive", Action::"Restore",
    Action::"MarkQualityPassed", Action::"UpdateQuality",
    Action::"AttachPublishedAssets", Action::"AttachTasteVector",
    Action::"SetFeatured", Action::"SetTaxonomy", Action::"AddCuratorNotes",
    Action::"MarkReplicationVerified",
    Action::"RecordVerification",
    Action::"AttestConsent", Action::"MarkBandsSelfConsistent"
  ],
  resource is WritingStyle
) when { principal has agent_type && principal.agent_type == "contributor" };

// Generic OData writes bypass the action ladder entirely: PATCH and DELETE are
// authorized as the lowercase `update` / `delete` actions, which no named-action
// forbid above covers. Without this, a contributor could PATCH a published
// entity's fields or DELETE it outright and never touch a governed action.
// `create` stays open — submissions legitimately create their draft.
forbid(
  principal,
  action in [Action::"update", Action::"delete"],
  resource is WritingStyle
) when { principal has agent_type && principal.agent_type == "contributor" };

// Human curator boundary (ARN-255): a signed-in human reaching the kernel with
// their own token is a Customer principal, which no agent_type forbid above
// ever matches — so without this a signed-in contributor could publish or archive any WritingStyle. Scoped
// to `principal is Customer` so the curation pipeline and the operator key,
// which carry no role, are unaffected.
forbid(
  principal,
  action in [
    Action::"Publish",
    Action::"Revise",
    Action::"Archive",
    Action::"Restore",
    Action::"MarkReplicationVerified",
    Action::"RecordVerification",
    Action::"AttestConsent",
    Action::"MarkBandsSelfConsistent",
    Action::"AddCuratorNotes",
    Action::"ReturnToDraft"
  ],
  resource is WritingStyle
) when { principal is Customer }
unless { principal has role && ["owner", "curator"].contains(principal.role) };
