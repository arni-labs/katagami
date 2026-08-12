// DesignElement — STANCE: authoring and rendering open; the verification verdict is gated.
//
// An element is produced by whoever is building the language, so Configure,
// Render and Rerender stay open exactly as they were. Verify and RejectRender
// are different in kind: they are the verdict on whether a render is good
// enough, which is the same class of act as MarkQualityPassed on the artifact
// types — an attestation, not a piece of authoring. A producer that could
// attest its own output would be marking its own homework.
permit(principal, action, resource is DesignElement);

// Contributor boundary (ARN-303), matching the artifact policies: contributors
// produce renders, they do not rule on them.
forbid(
  principal,
  action in [Action::"Verify", Action::"RejectRender"],
  resource is DesignElement
) when { principal has agent_type && principal.agent_type == "contributor" };

// An agent that will not say what kind of agent it is gets no benefit of the
// doubt on the verdict. `x-temper-agent-type` is optional, so a rule written
// only against the attribute above asks the caller whether it applies to it.
// Same fix as ARN-302 on the artifact policies.
forbid(
  principal is Agent,
  action in [Action::"Verify", Action::"RejectRender"],
  resource is DesignElement
) unless {
  principal has agent_type ||
  principal == Agent::"system"
};
