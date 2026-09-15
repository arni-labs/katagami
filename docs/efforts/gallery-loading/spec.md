# Specification

The home gallery must not await the command palette's full-catalog index. The search UI must remain available by button and keyboard, load catalog data only when requested, show loading/failure feedback, and preserve server-enforced anonymous versus signed-in visibility. A signed-in response must never enter a public cache. Existing gallery pagination, visitor shelf, and curator authorization must remain intact.

Measure public deployed behavior and isolate the index dependency with a controlled slow backend regression. Real Gmail sign-in verification requires an existing approved session; report that boundary honestly if unavailable. No changes to Google or Foundry authentication.
