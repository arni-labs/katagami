# Decisions & Tradeoffs

**Decision:** Fix ArtStyle's attribution policy rather than Cedar approval precedence.
**Came up because:** SetCredits remained denied after a narrow approval, while SubmitArtStyle already carries credits and provenance and the individual actions are prepublication authoring actions.
**Options:** Let permits override forbids globally; remove the attribution deny entirely; allow only the existing prepublication states while retaining ownership and curator exceptions.
**Chose the state-scoped rule because:** It restores the intended authoring contract without allowing edits to published attribution, weakening unrelated denials, or changing the kernel.
**Where:** katagami-commons/policies/art_style.cedar and its specs/policies mirror; tests/test_art_style_attribution_policy.py.

**Decision:** Prepare the repair without mutating live authorization policy.
**Came up because:** Native Temper exposes policy reads but explicitly reserves policy changes for humans; stale duplicate forbids are installed in production.
**Options:** Overwrite live policy through a different identity/route; prepare a tested app-source change for supported installation.
**Chose source delivery because:** It preserves the enforced administration boundary and provides a reviewable repair. Live replacement of stale policy copies and finalizer verification remain deployment requirements.
**Where:** This effort's spec and delivery report.
