"use server";

import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/owner";
import { createEntity, dispatchAction, uploadFile } from "@/lib/odata-mutations";

// The curator gate's other half: the finalizer stops writing styles at
// UnderReview with every Publish guard satisfied; the owner reads the voice
// and publishes it from the contract page.
export async function publishWritingStyle(id: string): Promise<void> {
  await assertOwner();
  await dispatchAction("WritingStyles", id, "Publish", {});
  revalidatePath("/voice");
  revalidatePath(`/voice/${id}`);
  revalidatePath("/under-review");
}

export interface VoiceIntakeResult {
  id?: string;
  error?: string;
}

// ARN-138 v1 — the find-your-style intake. Consent is bound at the moment the
// corpus enters the commons: basis opt_in, author, provenance, and the
// attestation checkbox all travel in the same dispatch as the files. The
// entity stays Draft ("awaiting extraction"); ARN-139 extraction derives the
// voice layer and bands from this corpus, and the curator gate still stands
// between everything and Published.
export async function submitVoiceIntake(
  _prev: VoiceIntakeResult,
  formData: FormData,
): Promise<VoiceIntakeResult> {
  try {
    await assertOwner();
    const name = String(formData.get("name") ?? "").trim();
    const author = String(formData.get("author") ?? "").trim();
    const provenance = String(formData.get("provenance") ?? "").trim();
    const consented = formData.get("consent") === "on";
    const refusals = String(formData.get("refusals") ?? "")
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    const samples = formData
      .getAll("samples")
      .map((s) => String(s).trim())
      .filter(Boolean);

    if (!consented) return { error: "The consent attestation is required." };
    if (!author) return { error: "Say who wrote these samples." };
    if (!provenance) return { error: "Say where these samples come from." };
    if (samples.length < 3) return { error: "At least 3 samples are needed for a usable fingerprint." };
    if (samples.length > 20) return { error: "20 samples is the ceiling — pick the best ones." };

    const slug = (name || author)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "intake";

    const fileIds: string[] = [];
    for (let i = 0; i < samples.length; i++) {
      fileIds.push(
        await uploadFile(
          `sample-${i + 1}.md`,
          `/katagami/writing-styles/intake/${slug}/sample-${i + 1}.md`,
          "text/markdown",
          samples[i],
        ),
      );
    }

    const created = await createEntity("WritingStyles", {});
    const id = created.entity_id;
    await dispatchAction("WritingStyles", id, "AttachCorpus", {
      corpus_file_ids: fileIds,
      corpus_manifest: JSON.stringify({
        // working_name is a hint for ARN-139 extraction (which owns naming);
        // there is deliberately no name-setting action on a Draft intake.
        working_name: name,
        items: fileIds.map((fid, i) => ({
          file_id: fid,
          kind: "opt-in-sample",
          words: samples[i].split(/\s+/).length,
        })),
      }),
      consent: JSON.stringify({
        basis: "opt_in",
        author,
        license: "personal corpus — rights reserved; licensed to katagami for style extraction",
        samples: samples.length,
        provenance,
        attested_by_owner: true,
      }),
    });
    if (name || refusals.length) {
      await dispatchAction("WritingStyles", id, "SetVoiceLayer", {
        persona: "",
        tone_scales: "{}",
        vocabulary: "{}",
        moves: "[]",
        register: "{}",
        refusals: JSON.stringify(refusals),
      });
    }
    revalidatePath("/voice");
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "intake failed" };
  }
}
