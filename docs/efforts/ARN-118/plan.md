# Build the manifestation encyclopedia maps

## Objective

Deliver populated, browsable maps for art, writing, palettes, and design languages, with recursive cells, representative work, sources, review, and comparisons. Preserve the existing collections and their navigation.

## Implementation

1. Check Genesis against the GitHub mirror before changing app files. Preserve Genesis-side changes and the existing visitor-access rules.
2. Inventory art and writing through all continuation pages, preserving identifiers and review statuses. Prepare a private mapping proposal with current clusters, uncertain placements, and gaps. Check existing unfinished work before proposing additions. Present the proposed cells and placements in a fixed-number batch, then wait for the user's selections before adding them.
3. Correct the cell document and its valid and invalid fixtures. Separate typed manifestation references from direct studies and source examples. Include nesting, multiple broader cells, cross-links, independent development by medium, and rights evidence. Ordinary description embeddings must not imply a validated style distance.
4. Add the numbered approval workflow and align it with the Temper cell lifecycle, document validation, and publication policies. Bind each decision to exact operations and a proposal revision. Test partial selections, changed proposals, rejected dependencies, repeated approvals, and attempts to bypass review through generic writes. Approval to generate must not approve publication of its results.
5. Add cell reads and graph traversal. Keep drafts private, respect visibility of linked Katagami works, preserve disconnected entries, and report graph conflicts.
6. Build the four map views, cell pages, and comparisons in the existing interface. Compare a nested browsing layout with a node-link overview before choosing the initial interaction. Keep representative examples free of interface styling effects.
7. Research and populate approved art and English writing proposals through the cell workflow, then palettes and design languages. Check individual source rights and inspect examples before publication. Request further numbered approvals for generated enrichment, new manifestations, and publication. Do not treat the earlier seed list as rights evidence or force its categories into the new map.
8. Run the complete local workflow against the real policies and source material. Inspect desktop and mobile views, revisions, review, source links, and example rendering.
9. Complete the required independent reviews and fix their findings. Merge the reviewed PR, publish app changes to Genesis, deploy, and verify the installed versions and live experience.

Each step must leave a testable result. Record deviations and technical decisions in [the decision log](decisions.md) when they occur.

## Current checkpoint

The user approved all 20 cells in batch B2 and requested their creation in the existing TemperPaw deployment. Deliver that approved part now: verify cell storage locally, install the cell specification into Katagami commons on TemperPaw, create the 20 private Draft records with their approved names and scopes, and read them back. Do not wait for map views or add relationships, existing manifestations, examples, or generated enrichment without a further numbered approval. Proposal files and local test records do not count as created encyclopedia cells.

The parser, validator, readers, and shared fixtures now separate manifestations from studies. The local upload denial was traced to a server started without authentication; an explicitly approved restart configured a test-only key on the isolated instance. Runtime verification is still required before production installation.

## Completion evidence

The effort report must link the PR, commits, installed app revisions, deployed encyclopedia, local and live test results, and unresolved source limitations. Keep proof and review evidence outside the repository. Do not report the collection as deployed before opening and checking the deployed pages.
