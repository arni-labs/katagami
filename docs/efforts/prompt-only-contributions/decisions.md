# Decisions

### D1 — Separate generation capability from exact model identity

**Decision**: Record requested model separately from actual exposed model and invocation evidence.
**Came up because**: Built-in image tools can return real images without exposing a model version or provider request ID.
**Options**: Force Fal-only metadata; fabricate identifiers; accept explicit unexposed model identity with the real harness/tool receipt.
**Chose honest built-in provenance because**: It supports the authorized generation route while preserving verifiable prompts and output hashes without false model claims.
**Where**: Finalizer generation validator and schema documentation.

### D2 — Prove text-only portability

**Decision**: Require paired text-to-image outputs with no input images for new portability proof.
**Came up because**: Prior edit comparisons established transformation behavior rather than generation from the written recipe alone.
**Options**: Retain image-edit proof; require matched subject descriptions and canonical text prompts across models.
**Chose text-only proof because**: It measures the user-requested portable prompt behavior directly.
**Where**: art_style_review.rs and the contribution contract.
