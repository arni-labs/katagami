# Plan

1. Inspect overlapping work and capture deployed baseline; trace gallery, layout and search reads.
2. Remove full-catalog search construction from initial rendering, retaining existing tier filters behind an on-demand server endpoint. Reduce unnecessary serialization only where confirmed by measurements.
3. Add behavior tests for nonblocking gallery, on-demand search, failure/retry and visibility. Run repository checks and browser verification on real deployment plus controlled dependency tests.
4. Review against REVIEW.md, open PR, report shipment, verify preview/production as available, and record any remaining deployment/auth prerequisites in the Effort.

## What we are addressing

A full-catalog command-palette index blocks initial gallery rendering on a cold signed-in visit. Deployment diagnostics and review/proof records must also be made available to complete verification.

## Expected end state

The gallery renders independently of optional search indexing. The deployed signed-in flow, thumbnails, search and pagination are verified with real content; review/proof gates pass before merge. Missing access is reported with exact evidence, never treated as a passing check.
