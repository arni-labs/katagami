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
