# Intent: fast gallery after Google sign-in

The gallery at katagami.ai takes excessively long to load immediately after Gmail sign-in. Reproduce the production read path, identify the blocking work, and fix it without changing authentication or catalog visibility rules. Verify the deployed gallery and preserve search, pagination, thumbnails, and curator controls.

Scope: gallery rendering and its data dependencies. Foundry authentication recovery belongs to ARN-511 and is excluded.

Existing work checked: GitHub open/recent PRs and Temper gallery Intents/Efforts. PR #307 / ARN-489 handles preview launcher tooling; #292 and #295 handle encyclopedia navigation. None addresses this post-login home gallery delay. Checkout starts clean at 152e7d0.

Success: real-content browser evidence and timings before/after, regression coverage for the blocking dependency, repository checks and review, deployment verification with explicit limits on Google-session availability.
