# Intent: fast gallery after Google sign-in (GH-311)

Effort key GH-311 identifies GitHub issue/pull request https://github.com/arni-labs/katagami/pull/311. It is the same accepted Temper Effort 01a0a62d-c660-75b3-80cd-744b04c55434; the original gallery-loading paths remain its historical attachments.

The gallery at katagami.ai takes excessively long to load immediately after Gmail sign-in. Reproduce the production read path, identify the blocking work, and fix it without changing authentication or catalog visibility rules. Verify the deployed gallery and preserve search, pagination, thumbnails, and curator controls.

Scope: gallery rendering and its data dependencies. Foundry authentication recovery belongs to ARN-511 and is excluded.

Existing work checked: GitHub open/recent PRs and Temper gallery Intents/Efforts. PR #307 / ARN-489 handles preview launcher tooling; #292 and #295 handle encyclopedia navigation. None addresses this post-login home gallery delay. Checkout starts clean at 152e7d0.

Success: real-content browser evidence and timings before/after, regression coverage for the blocking dependency, repository checks and review, deployment verification with explicit limits on Google-session availability.
