# Decisions

Decision: Deliver a local feedback build before any production rollout.
Came up because: Rita explicitly asked to see the implementation locally and provide feedback.
Options: Deploy immediately through the full production lifecycle; stop at the requested verified local build.
Chose the local feedback build because: It gives Rita a concrete UI to evaluate before production behavior changes.
Where: ARN-475; encyclopedia UI.

Decision: Use an isolated worktree on arni-big when its Copy operation fails.
Came up because: The governed Copy returned HTTP 409 because arni-big-copy is already claimed by a live sandbox.
Options: Repair the shared computer provisioning platform; use a separate worktree on the existing governed computer.
Chose a separate worktree because: It isolates repository changes without expanding this UI task into platform work.
Where: /home/tl-user/work/katagami-arn475, codex/encyclopedia-ux.

Decision: Keep camera snapshots behind a stable getter and memoize the detail sheet.
Came up because: Passing camera state through the sheet causes its far-jump graph traversal to rerun while panning; the React compiler also rejects ref captures in the original callbacks.
Options: Recompute the sheet on every camera frame; read the camera at navigation time through a stable callback.
Chose the stable snapshot getter because: Navigation retains the latest camera while the sheet renders only when its content or selected tab changes.
Where: ui/src/components/encyclopedia/use-map-camera.ts and encyclopedia-map.tsx.

Decision: Treat production read access as unresolved after the Cedar denial.
Came up because: EncyclopediaCells list returned policy1004 and no approval decision identifier.
Options: Use a different credential or endpoint without confirmation; ask Rita to authorize the application read route and continue fixture-based verification independently.
Chose explicit authorization because: The existing denial cannot be silently bypassed. The local production-backed preview remains unverified until access is resolved.
Where: ARN-475; production read attempt in this Codex session.

## Keep the expanded parent visible

**Decision:** Show the expanded topic above its immediate children with visible connectors.

**Came up because:** The first browser inspection showed that children alone looked like an unrelated card grid.

**Options:** Keep breadcrumbs as the only parent context, or retain a parent node in the canvas.

**Chose a parent node over breadcrumbs alone because:** It explains the relationship spatially while still drawing only visible children; it adds vertical space, included in fit-to-map framing.

**Where:** ui/src/components/encyclopedia/encyclopedia-map.tsx and scene.ts.

## Keep the explorer inside the available viewport

**Decision:** Fix the encyclopedia canvas between the existing site navigation bars.

**Came up because:** Mobile browser verification scrolled the page shell during topic navigation, moving search offscreen and revealing the site footer.

**Options:** Keep the full document scroll, or give the explorer its own fixed viewport.

**Chose a fixed viewport because:** Navigation and search stay available while canvas gestures remain local; the encyclopedia does not need the site footer during exploration.

**Where:** ui/src/components/encyclopedia/map.css.

## Use the frontend production read path for the preview

**Decision:** Configure the local Next.js server with the deployed frontend environment, keeping the backend credential server-only.

**Came up because:** The implementing agent confused a denied MCP collection read with frontend access. Rita clarified that the frontend uses its own backend connection. The configured frontend credential returned HTTP 200 and the page loaded 744 attested topics.

**Options:** Gate preview data on MCP collection access, or verify the existing frontend data loader with its production configuration.

**Chose the frontend path because:** It is the actual system under test. An unrelated MCP denial does not establish a frontend failure. Future preview verification must name the frontend backend host and report the page result separately from MCP status.

**Where:** Local ignored ui/.env.local and ui/src/lib/encyclopedia.ts.

## Exclude the fixed explorer from route translation

**Decision:** Disable the enclosing page-entry transform only when it contains the fixed encyclopedia explorer.

**Came up because:** The browser measured the fixed explorer at height zero: route-enter retained an identity transform, making the short route wrapper its containing block.

**Options:** Keep the route transform and portal the whole explorer, or remove the unrelated transform for this route.

**Chose removing the route transform because:** It restores viewport positioning without adding a portal or changing other pages.

**Where:** ui/src/components/encyclopedia/map.css.

## Restore and improve the existing encyclopedia UI

**Decision:** Restore the pre-effort encyclopedia map as the base and apply performance, richer focus cards, and spatial depth within it.

**Came up because:** Rita said the uniform-card prototype disregarded the existing UI and supplied desktop and mobile references. She explicitly requires iteration on the existing /encyclopedia experience, preserving all existing views and controls.

**Options:** Continue the replacement grid and build a separate neighborhood view, or restore the established map, cards, typed connectors, minimap, and detail sheet.

**Chose the existing UI because:** It already carries the required content structure. The replacement removed that visual hierarchy. The prototype is preserved at commit 6885cc80 and /tmp/arn475-uniform-prototype.tsx; it is not a separate user route.

**Where:** ui/src/components/encyclopedia/encyclopedia-map.tsx, map-cards.tsx, and map-space.ts.

## Keep spatial depth readable

**Decision:** Compare flat and depth projections using the same focused neighborhood and front-facing material cards.

**Came up because:** The references communicate depth through a dominant focal node, smaller context, rich mixed media, and labelled relationships; a freely orbiting sphere would hide text and connections.

**Options:** Uniform grid; orbiting sphere with tilted cards; existing map with an expanded focal node and optional depth projection.

**Chose a depth projection because:** It retains the existing 2D camera gestures and readable HTML cards while rotation reveals spatial layering. Depth can be turned off in the same view for direct comparison.

**Where:** map-space.ts and the Depth controls on /encyclopedia.
