// ElementManifest — STANCE: drafting open; activating and superseding are gated.
//
// SetElements and SetCompositions are authoring — building up the manifest.
// Activate and Supersede decide which manifest the system is actually using,
// which is the publish decision for this entity under another name.
//
// Both are `kind = "internal"`, so the platform is their normal caller and the
// platform's own dispatch does not pass through this gate; naming them here
// closes the HTTP surface, where a caller could otherwise activate a manifest
// by hand.
permit(principal, action, resource is ElementManifest);

// Contributor boundary (ARN-303), matching Publish on the artifact types.
forbid(
  principal,
  action in [Action::"Activate", Action::"Supersede"],
  resource is ElementManifest
) when { principal has agent_type && principal.agent_type == "contributor" };

// Same omission fix as ARN-302: an agent that declares no type is refused.
forbid(
  principal is Agent,
  action in [Action::"Activate", Action::"Supersede"],
  resource is ElementManifest
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
