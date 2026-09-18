# Decisions & Tradeoffs

**Decision:** Fix ArtStyle's attribution policy rather than Cedar approval precedence.
**Came up because:** SetCredits remained denied after a narrow approval, while SubmitArtStyle already carries credits and provenance and the individual actions are prepublication authoring actions.
**Options:** Let permits override forbids globally; remove the attribution deny entirely; allow only the existing prepublication states while retaining ownership and curator exceptions.
**Chose the state-scoped rule because:** It restores the intended authoring contract without allowing edits to published attribution, weakening unrelated denials, or changing the kernel.
**Where:** katagami-commons/policies/art_style.cedar and its specs/policies mirror; katagami-curation/tests/test_art_style_attribution_policy.py.

**Decision:** Prepare the repair without mutating live authorization policy.
**Came up because:** Native Temper exposes policy reads but explicitly reserves policy changes for humans; stale duplicate forbids are installed in production.
**Options:** Overwrite live policy through a different identity/route; prepare a tested app-source change for supported installation.
**Chose source delivery because:** It preserves the enforced administration boundary and provides a reviewable repair. Live replacement of stale policy copies and finalizer verification remain deployment requirements.
**Where:** This effort's spec and delivery report.

**Decision:** Run the new policy regression before the legacy integration suite and retain its proposed CI job separately.
**Came up because:** The broader authorization suites have 18 identical baseline failures. GitHub rejected the workflow change because the configured GitHub App lacks workflows permission.
**Options:** Change credentials to bypass the restriction; abandon the code fix; push the source repair and test target without modifying workflows.
**Chose the supported source-only push because:** The repair and tests remain reviewable within the available permission. The existing Makefile runs the regression first; a separate workflow patch requires authorized workflow access.
**Where:** katagami-curation/Makefile; retained morrow-policy-ci.patch in the session artifacts.
