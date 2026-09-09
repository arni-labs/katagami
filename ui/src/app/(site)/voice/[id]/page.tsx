import { permanentRedirect } from "next/navigation";

/**
 * One style, one page.
 *
 * This route used to render its own detail view. `/writing/<id>` renders the
 * same record with more of it — the corpus files at length with their sources
 * and word counts, and the handoff that gives the voice to an agent — in the
 * design language the writing lane actually uses, so keeping a second, thinner
 * view of the same entity meant every addition had to be made twice and the
 * `/voice` catalog quietly led to the poorer one.
 *
 * The address keeps working, including any link already sent or bookmarked.
 * `/voice/<id>/VOICE.md` is untouched: that is the portable artifact's own
 * address and is nobody's duplicate.
 *
 * The gate does not move. `/writing/<id>` refuses everyone but the owner
 * exactly as this page did, and refuses before it reads the record — so this
 * redirect discloses nothing the destination would not.
 */
export default async function VoiceDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/writing/${encodeURIComponent(id)}`);
}
