// DesignSource — STANCE: open by design. Every action here is authoring.
//
// A DesignSource is the research agent's own record of something it found:
// Submit records the source, Index records the topics extracted from it, and
// IndexFailed records that the extraction did not work. None of the three is a
// judgement on anyone else's work, nothing here is published to the commons,
// and the research lane creates these continuously
// (`katagami-curation/agents/curator/skills/research-direction`).
//
// So there is deliberately no boundary: gating the research index would slow
// the pipeline down and protect nothing. Recorded as a decision rather than an
// omission — if a reason to gate it appears, this comment is the thing to
// change.
permit(principal, action, resource is DesignSource);
