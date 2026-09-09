# Encyclopedia UI: consolidated vision and feedback
Updated September 9, 2026

This document consolidates the user's requests and feedback from this conversation. It distinguishes the intended experience, firm constraints, exploratory ideas, and the issues to address in the next iteration.

## 1. Scope and starting point

The work began as a request to improve the UX and UI of writing styles and the encyclopedia. The user then explicitly prioritized the encyclopedia.

Improve the encyclopedia that already exists. Evolve its current UI, features, content, and route rather than building a replacement experience on a different page. The user repeatedly emphasized this because the first prototype looked substantially different and appeared to disregard prior work.

The original agent subsequently made more changes. The user rejected this agent's iteration and requested a reset to the latest default branch before offering further feedback. The current accepted starting point is that original agent's work on `master`, not the rejected prototype.

Work must happen in an isolated worktree and a separate branch. Do not edit the primary `main`/`master` checkout.

## 2. The desired experience

The encyclopedia should feel like a fast, spatial environment for exploring knowledge: an effectively infinite canvas containing connected topics and their material.

The user compared it to Google Maps:
- Zooming out should simplify the view.
- Zooming in should reveal useful detail.
- A close view should communicate different information from a distant view.
- The initial view should orient the reader without overwhelming them.
- Exploration should feel controlled and easy, including on mobile.

The user liked the speed and apparent infinity of the first canvas prototype. Those qualities should survive further design work.

“Highly performant” is a central requirement. A large encyclopedia should remain responsive while panning, zooming, selecting, and expanding. The user did not specify a frame-rate target, a maximum dataset size, or a mandated rendering library.

## 3. Explicit expansion and semantic zoom

Expansion and zoom serve different purposes.

**Expansion controls what is revealed.** The reader chooses which topics and branches are open. They need to be able to expand a node, explore its child nodes and connections, and collapse it again.

**Zoom controls the detail of what has already been revealed.** Zooming in must not expand every nearby topic or expose all branches at once. More detail should appear within the things the reader has chosen to expand.

The intended progression is:
1. See a clear overview with meaningful entry nodes.
2. Choose and expand a category or topic.
3. Reveal its children and relevant connections in manageable groups.
4. Zoom into that opened area to inspect its content.
5. Expand another node deliberately, or collapse a branch to simplify the view.

At full detail, a node can become a card containing information and material. At a distance, it should have a simpler representation. The user has not prescribed the exact number of detail levels, page size, or expansion-control design.

## 4. Category entry nodes

Bare labels such as “Art” or “Writing,” followed by a cell count, are insufficient.

The user observed category text positioned away from the actual cells it supposedly describes. This makes the map difficult to understand.

Categories should be visual, meaningful entry nodes that can be expanded and zoomed into. Their position and connections should explain where their topics belong. A count may support orientation, but should not be the category's entire presentation.

## 5. Depth, 3D, and immersion

The user described the prototype as too flat: “cards, cards, cards of the same size.”

The desired alternative has visible hierarchy and depth:
- Different degrees of prominence for a focal topic, its context, its children, and peripheral material.
- Richer, more informative nodes instead of a uniform field of identical cards.
- A sense of exploring a connected spatial environment.
- Potentially dimensional placement, rotation, or the ability to look around the graph.

Full 3D is an idea to investigate, not a settled implementation requirement. The user asked whether Three.js or something else would make sense, and delegated the design and implementation choice. They did not mandate Three.js.

Any depth or immersion treatment must support readable information, understandable connections, fast interaction, and mobile use. The conversation has not settled whether the final implementation should use full 3D, a perspective projection, or another spatial approach.

## 6. Informative nodes and the supplied visual references

The user supplied three concept images: one desktop view and two mobile views.

They show:
- An established Katagami encyclopedia shell.
- A prominent central topic, “Naturalist observation.”
- A central card combining botanical imagery, writing material, and a palette.
- Smaller related topic cards and compact name-only nodes.
- Connections labeled with their meaning, such as broader, narrower, or related technique.
- A minimap and zoom controls.
- A desktop reader beside the canvas.
- A mobile reader that can collapse to a summary or expand into a bottom sheet.
- Material, Connections, and Notes sections.
- Source information and links.

These images communicate hierarchy, richer content, and the relationship between the canvas and reader. They are not an instruction to fabricate the pictured topics or assets, copy every pixel, or replace existing functionality.

The references are:
1. [Desktop concept](/Users/seshendranalla/.codex/generated_images/01a07e44-2a66-71b3-9bd4-d380c57209fa/exec-8459d122-14e8-4398-8303-ccf13229016c.png)
2. [Mobile expanded reader](</Users/seshendranalla/Downloads/Codex Image Sep 8, 2026, 06_14_17 PM.png>)
3. [Mobile canvas and collapsed reader](</Users/seshendranalla/Downloads/Codex Image Sep 8, 2026, 06_14_02 PM.png>)

## 7. Compact information design

The encyclopedia is a canvas with limited screen space. Large headings and oversized text consume room that should support exploration.

For this portion of the product, the user explicitly permits smaller fonts. The view should be informative and compact while remaining legible.

This applies to the working canvas and its controls. It does not mean every node should expose every description, source, and material simultaneously.

## 8. Scrolling and gesture ownership

The user reported that scrolling moves both the page and the canvas. They described this as a mess.

The encyclopedia must behave as a canvas:
- Canvas gestures should act on the canvas without also moving the page.
- Panning and zooming should be efficient and predictable.
- Search and navigation controls should remain usable during exploration.
- Reader content may need its own scrolling area, separate from canvas navigation.
- The mobile experience must support the same core exploration tasks.

The user has not prescribed the exact wheel, trackpad, pinch, or rotation gesture mapping. The requirement is that the interactions work coherently and do not compete with page scrolling.

## 9. Visibility and the “foggy” card problem

The user reported that a close-up card, such as Cubism, becomes foggy or appears covered by a white overlay.

A topic should remain clear and readable when the reader zooms in to inspect it. Background styling, focus effects, and overlapping nodes must not obscure the thing being explored.

The user also described difficulty seeing topics such as Expressionism behind other content. This needs investigation as a visibility and layout problem rather than acceptance as a visual effect.

## 10. What a topic image represents

The user noticed an image on Impressionism that did not communicate Impressionism itself. It appeared to be an image from an associated art style, possibly resembling a photograph.

The UI needs to distinguish:
- A study or material representing the topic.
- An art style or other record connected to the topic.
- The explanation and evidence for that connection.

A related record's thumbnail should not silently become the topic's defining image.

The user explicitly noted that this may involve both the UI and the application's underlying content or data model. Investigation should establish whether the problem is image selection, presentation, the connection itself, or a combination.

## 11. Connections and repeated records

The user saw what looked like one topic linked to the same art style multiple times. They were not certain whether these were actual duplicate links or a result of obscured nodes and hard-to-read connections.

The requested outcome is a graph that is easy to parse:
- Make the origin and destination of a connection clear.
- Communicate what the connection means.
- Avoid showing repeated copies of the same record in a way that suggests different entities.
- Distinguish genuine multiple relationships from accidental duplication.
- Keep connections legible when nodes are expanded or viewed close up.

Do not assume the underlying data is duplicated solely from this visual report; verify the cause.

## 12. Preserve and show the real application

The user wants the local frontend running against the production backend so the preview contains substantial real data.

They corrected an earlier misunderstanding: MCP access is separate from the frontend's normal backend connection. MCP is not the mechanism by which the frontend must retrieve its data.

The preview must be visible and accessible. The user repeatedly asked to see what had been built because earlier progress was not available to inspect.

The feedback loop is:
1. Implement a concrete iteration.
2. Run it locally with the real backend configuration.
3. Open and verify the actual UI.
4. Show the user that version.
5. Take another round of feedback.

Showing a local iteration for feedback is the current deliverable; it is not a request to deploy an unapproved redesign to production.

## 13. Directions already rejected or corrected

- Rebuilding the encyclopedia as a substantially different UI while losing the existing experience.
- Creating a separate replacement page or route.
- Treating a uniform set of same-sized cards as sufficient spatial design.
- Having zoom reveal everything at once.
- Using category names and counts without useful visual entry nodes.
- Letting one scroll gesture move both the page and the canvas.
- Obscuring close-up nodes with fogging, white overlays, or unreadable overlap.
- Presenting a connected record's image as if it represented the topic itself.
- Treating an MCP access failure as proof that the frontend cannot use production data.
- Continuing to iterate on the rejected prototype after the request to reset to the original agent's latest work.
- Editing the primary master checkout.

## 14. The current requested iteration

The user asked to address navigation and clarity first, then show another iteration.

The immediate work is:
1. Give the canvas exclusive ownership of its navigation gestures.
2. Make the interface compact, with smaller canvas typography where useful.
3. Provide visual category nodes for Art, Writing, and other available categories.
4. Make expansion explicit per branch and independent of zoom.
5. Remove the fogging and resolve obstructed content.
6. Correct the distinction between topic material and related-record imagery.
7. Clarify connections and investigate repeated record nodes.
8. Verify the result in the existing encyclopedia route and show it locally.

The broader depth, 3D, and immersive exploration ideas remain part of the vision. The latest feedback prioritizes basic navigation and information clarity before another round of spatial refinement.

## 15. Questions still open

These decisions have not been settled by the user:
- Whether full 3D and free rotation improve the experience enough to justify them.
- Which rendering technology best satisfies performance and readability.
- The exact visual representations at different zoom levels.
- How many children to reveal in one expansion.
- How multiple open branches should be arranged and retained.
- The most useful category preview when no representative study exists.
- Which suspected duplicate links are data defects and which are rendering problems.

Implementation choices should be evaluated against the established requirements above. They should not be described as user decisions until the user has accepted them.
