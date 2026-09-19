# Reviewing katagami

Use the installed Stack review contract, or the bundled [Stack review contract](.stack/REVIEW.md) when Stack is not installed. Review the accepted outcome and changed behavior; independently exercise the feature when useful. Report concrete defects introduced or worsened by this change, with reproduction evidence and location. No mandatory panel, review markers, JSON record or unrelated cleanup.

Apply these repository checks only where the change touches them:

- Exercise changed gallery/contribution flows in a browser with real content; check images, links, mobile layout and the applicable design contract (`ui/DESIGN.md` for the site, the curation rulebook for generated languages).
- Check changed Cedar/OAuth/MCP paths for permitted and denied principals, secret handling and R2 scope.
- For app changes, read resulting entities back and test the affected lifecycle. Check WASM declarations in `app.toml`, runtime templates and dependency pins. Existing dispatch-based app behavior is not grounds for unrelated architectural work.
- Preserve Genesis-side app changes and verify pinned installation when deployment is in scope.
- Use `cd ui && npm test`, the affected curation contract tests and `.agents/skills/verify-katagami/` as applicable.

Report what you tested, the revision, findings and material limits in plain language.
