# Plan

1. Inspect overlapping work and capture deployed baseline; trace gallery, layout and search reads.
2. Remove full-catalog search construction from initial rendering, retaining existing tier filters behind an on-demand server endpoint. Reduce unnecessary serialization only where confirmed by measurements.
3. Add behavior tests for nonblocking gallery, on-demand search, failure/retry and visibility. Run repository checks and browser verification on real deployment plus controlled dependency tests.
4. Review against REVIEW.md, open PR, report shipment, verify preview/production as available, and record any remaining deployment/auth prerequisites in the Effort.
