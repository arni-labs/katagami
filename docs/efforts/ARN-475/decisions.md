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
