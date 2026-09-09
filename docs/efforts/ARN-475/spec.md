# Encyclopedia exploration contract

Use the existing attested encyclopedia read model and Katagami site design tokens. Preserve access controls, provenance, studies, manifestations, and connections.

The overview groups subjects by their existing map membership. A reader can pan, zoom around the pointer or pinch midpoint, search at every viewport size, enter a subject, expand its immediate children, and return through a breadcrumb. Zoom changes representation from groups to compact nodes to readable cards. Expansion must not render an entire descendant tree at once. Search reaches all loaded valid cells, including disconnected and cyclic components.

Rendering work is bounded by the visible scene, with viewport culling and aggregation where individual labels would collide. Layout must avoid iterative whole-graph force simulation. Camera changes are coalesced to animation frames; no animation loop runs while idle. Touch targets are at least 44 pixels. Mobile detail opens only on request and does not obscure navigation controls. Reduced-motion preference is honored.

Compare a flat semantic map and a depth/rotation sketch before selecting the implementation. Validate real backend content, touch behavior, keyboard controls, drill-down/backtracking, and a large synthetic performance fixture. Synthetic data is for tests only.

Deliverable is a local feedback build; production rollout waits for Rita's feedback.
