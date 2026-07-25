// The Katagami contribution tools (ARN-152) — a small, explicit surface
// mirroring the proven contributor ladder. Agents author and submit;
// everything lands UnderReview attributed to the owning human, and the
// Cedar contributor boundary refuses publish/verify server-side.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { config } from "./config.js";
import { identityFromAuth } from "./auth.js";
import {
  action,
  createEntity,
  getEntity,
  ingestImage,
  ingestImageBytesWithDigest,
  ingestImageWithDigest,
  listEntities,
  principalId,
  temperAction,
  TemperError,
  uploadFile,
  type EntityRow,
  type Identity,
} from "./temper.js";

const ART_STYLE_PROOF_CATEGORIES = [
  "human_portrait",
  "nonhuman_living",
  "still_life_object",
  "landscape_environment",
] as const;

const ART_STYLE_SOURCE_MEDIA = [
  "documentary photograph",
  "black-ink line drawing",
  "neutral synthetic 3d render",
  "flat vector illustration",
] as const;

const KINDS = {
  language: { set: "DesignLanguages", path: "language" },
  palette: { set: "PaletteSystems", path: "palettes" },
  art_style: { set: "ArtStyles", path: "art-styles" },
} as const;

type Kind = keyof typeof KINDS;
const kindSchema = z.enum(["language", "palette", "art_style"]);

// The public semantic-search surface (ARN-244) lives in the Next app; the MCP
// tool is a thin wrapper over it, so ranking has exactly one implementation.
// `search` uses the design-commons lane names (language | palette | art-style),
// which differ from the `kind` enum's `art_style`.
const searchLaneSchema = z.enum(["language", "palette", "art-style"]);

async function searchCommons(params: {
  query: string;
  lane?: string;
  k?: number;
  detailed?: boolean;
}): Promise<unknown> {
  const url = new URL(`${config.galleryUrl}/api/search`);
  url.searchParams.set("q", params.query);
  if (params.lane) url.searchParams.set("lane", params.lane);
  if (params.k) url.searchParams.set("k", String(params.k));
  url.searchParams.set("format", params.detailed ? "detailed" : "concise");
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new TemperError(
      `search failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
      res.status,
    );
  }
  return res.json();
}

function galleryUrl(kind: Kind, id: string): string {
  return `${config.galleryUrl}/${KINDS[kind].path}/${id}`;
}

/** Objects and manifests travel as JSON strings; lists stay native arrays —
 *  the engine's list guards resolve native arrays only (hard-won bake-off
 *  lesson, ARN-95). */
function asJsonString(v: unknown): string {
  if (v === undefined || v === null) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function summarize(row: EntityRow) {
  const f = row.fields ?? {};
  return {
    id: row.entity_id,
    status: row.status ?? "",
    name: (f.name as string) ?? "",
    slug: (f.slug as string) ?? "",
    tags: Array.isArray(f.tags) ? f.tags : [],
    lineage_type: (f.lineage_type as string) ?? "",
    parent_ids: Array.isArray(f.parent_ids) ? f.parent_ids : [],
  };
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

const artStyleGenerationRecord = z
  .object({
    schema_version: z.literal("1"),
    kind: z.literal("art_style_proof"),
    style_slug: z.string(),
    source: z
      .object({
        file_id: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    output: z
      .object({
        file_id: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        prompt_sha256: z.string().regex(/^[a-f0-9]{64}$/),
        provider_request_id: z.string().optional(),
      })
      .strict(),
  })
  .strict();

const artStyleProofInput = z.object({
  file_id: z.string().min(1),
  category: z.enum(ART_STYLE_PROOF_CATEGORIES),
  subject: z.string().min(1),
  composition: z.string().min(1),
  source_medium: z.enum(ART_STYLE_SOURCE_MEDIA),
  mode: z.literal("image_edit"),
  style_reference_used: z.literal(false),
  model: z.object({ provider: z.string().min(1), model: z.string().min(1) }).strict(),
  generation_record: artStyleGenerationRecord.describe(
    "Contributor-supplied provenance binding the exact prompt hash, imported source bytes, image model request when available, and imported output bytes. Katagami verifies the files and cross-model matrix but does not generate them.",
  ),
}).strict();

const lineageInput = {
  parent_ids: z.array(z.string()).optional().describe("Katagami entity ids this derives from"),
  lineage_type: z.enum(["original", "evolution", "remix"]).optional(),
  generation_number: z.number().int().min(0).optional(),
};

const provenanceInput = {
  model_provenance: z
    .object({ model: z.string(), provider: z.string() })
    .optional()
    .describe("The model/agent that authored this work"),
  credits: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Credits: traditions and sources honored, never impersonated people"),
};

async function requireParent(id: Identity, kind: Kind, parentId: string): Promise<EntityRow> {
  // Actions on unknown ids auto-create entities (platform behavior) — an
  // existence check keeps typos from minting ghost drafts.
  const parent = await getEntity(id, KINDS[kind].set, parentId);
  if (!parent) throw new TemperError(`Parent ${kind} '${parentId}' does not exist`, 404);
  return parent;
}

/** Agents act, humans own: stamp the owning human onto the entity so the
 *  my-submissions page and withdraw checks can find it. */
async function setCreator(id: Identity, set: string, entityId: string): Promise<void> {
  await action(id, set, entityId, "SetCreator", {
    creator_sub: id.sub,
    creator_email: id.email,
    creator_name: "",
  });
}

export function buildServer(auth: AuthInfo): McpServer {
  const id = identityFromAuth(auth);
  const server = new McpServer({ name: "katagami", version: "0.1.0" });

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "The identities behind this connection: the human account that owns the work and the agent client acting for it.",
      inputSchema: {},
    },
    async () =>
      ok({
        human_sub: id.sub,
        human_email: id.email,
        agent_client_id: id.clientId,
        grant_id: id.grantId,
        temper_principal: principalId(id),
        rules:
          "Submissions land UnderReview attributed to the human; curators publish; the human can revoke this grant at any time.",
      }),
  );

  server.registerTool(
    "search_styles",
    {
      title: "Search the commons",
      description:
        "Search published design languages, palette systems, and art styles by name, slug, or tag.",
      inputSchema: {
        kind: kindSchema,
        query: z.string().optional().describe("Case-insensitive match on name/slug/tags"),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ kind, query, limit }) => {
      const rows = await listEntities(id, KINDS[kind as Kind].set, "Status eq 'Published'");
      const q = (query ?? "").toLowerCase();
      const hits = rows
        .map(summarize)
        .filter(
          (r) =>
            !q ||
            r.name.toLowerCase().includes(q) ||
            r.slug.toLowerCase().includes(q) ||
            r.tags.some((t) => String(t).toLowerCase().includes(q)),
        )
        .slice(0, limit ?? 20);
      return ok({ count: hits.length, results: hits });
    },
  );

  server.registerTool(
    "katagami_search",
    {
      title: "Search the commons by meaning",
      description:
        "Free-text semantic search over published design languages, palette systems, and art styles. Describe what you want in a phrase ('warm editorial serif', 'playful geometric', 'hand-drawn watercolor') and get the closest matches ranked by meaning — not substring. Returns a few high-signal results, each with a stable id, a similarity score, the gallery URL, and (for languages) the DESIGN.md URL to pull the full spec with get_style or a fetch. Omit 'lane' to search across all three lanes at once.",
      inputSchema: {
        query: z.string().min(1).describe("What you're looking for, in plain words"),
        lane: searchLaneSchema
          .optional()
          .describe("Restrict to one lane; omit to search all lanes"),
        k: z
          .number()
          .int()
          .min(1)
          .max(25)
          .optional()
          .describe("How many results (default 8)"),
        response_format: z
          .enum(["concise", "detailed"])
          .optional()
          .describe(
            "concise (default): id, name, score, links. detailed: adds tags, medium, and a one-line summary.",
          ),
      },
    },
    async ({ query, lane, k, response_format }) => {
      try {
        const data = await searchCommons({
          query,
          lane,
          k,
          detailed: response_format === "detailed",
        });
        return ok(data);
      } catch (err) {
        return fail(err instanceof Error ? err.message : "search failed");
      }
    },
  );

  server.registerTool(
    "get_style",
    {
      title: "Get a style",
      description:
        "Full spec of one entity. For design languages, DESIGN.md lives at <gallery>/language/<id>/DESIGN.md.",
      inputSchema: { kind: kindSchema, id: z.string() },
    },
    async ({ kind, id: entityId }) => {
      const row = await getEntity(id, KINDS[kind as Kind].set, entityId);
      if (!row) return fail(`No ${kind} with id '${entityId}'.`);
      const out: Record<string, unknown> = {
        ...summarize(row),
        fields: row.fields ?? {},
        url: galleryUrl(kind as Kind, entityId),
      };
      if (kind === "language") out.design_md_url = `${galleryUrl("language", entityId)}/DESIGN.md`;
      return ok(out);
    },
  );

  server.registerTool(
    "remix",
    {
      title: "Remix a style",
      description:
        "Declare a derivation: creates a Draft child of an existing entity with lineage recorded (a tracked action, never a silent copy). Finish it with the matching submit_* tool, passing the returned entity_id.",
      inputSchema: {
        kind: kindSchema,
        parent_id: z.string(),
        name: z.string(),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        lineage_type: z.enum(["evolution", "remix"]).optional(),
      },
    },
    async ({ kind, parent_id, name, slug, lineage_type }) => {
      const parent = await requireParent(id, kind as Kind, parent_id);
      const parentGen = Number(parent.fields?.generation_number ?? 0);
      const set = KINDS[kind as Kind].set;
      const draftId = await createEntity(id, set);
      await action(id, set, draftId, "SetName", { name, slug });
      await action(id, set, draftId, "SetLineage", {
        parent_ids: [parent_id],
        lineage_type: lineage_type ?? "remix",
        generation_number: parentGen + 1,
      });
      await setCreator(id, set, draftId);
      return ok({
        entity_id: draftId,
        status: "Draft",
        parent: summarize(parent),
        next: `Author the content, then call submit_${kind === "language" ? "design_language" : kind === "palette" ? "palette_system" : "art_style"} with entity_id='${draftId}'.`,
      });
    },
  );

  server.registerTool(
    "import_art_style_proof_image",
    {
      title: "Import an ArtStyle proof image",
      description:
        "Import and lock one contributor-supplied source or output image for an ArtStyle proof, either by HTTPS URL or base64 bytes. Katagami stores and hashes the exact bytes; it does not generate or edit the image. TemperPaw contributors may create images with PawMedia before importing them, while other contributors use their own tools.",
      inputSchema: {
        image_url: z.string().url().startsWith("https://").optional(),
        image_base64: z
          .string()
          .min(1)
          .max(11_184_812)
          .optional()
          .describe("Raw base64 for one contributor-supplied image, at most 8MB decoded"),
        mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
        label: z.string().regex(/^[a-z0-9-]+$/).max(80),
      },
    },
    async ({ image_url, image_base64, mime_type, label }) => {
      try {
        if (Boolean(image_url) === Boolean(image_base64))
          throw new TemperError("Provide exactly one of image_url or image_base64", 400);
        if (image_base64 && !mime_type)
          throw new TemperError("mime_type is required with image_base64", 400);
        if (image_url && mime_type)
          throw new TemperError("mime_type is only accepted with image_base64", 400);
        let imported;
        if (image_url) {
          imported = await ingestImageWithDigest(id, image_url, label);
        } else {
          const encoded = image_base64!.replace(/\s+/g, "");
          if (
            encoded.length % 4 !== 0 ||
            !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
              encoded,
            )
          )
            throw new TemperError("image_base64 is not valid base64", 400);
          imported = await ingestImageBytesWithDigest(
            id,
            new Uint8Array(Buffer.from(encoded, "base64")),
            mime_type!,
            label,
          );
        }
        await temperAction(id, "Files", imported.fileId, "Lock");
        const file = await getEntity(id, "Files", imported.fileId);
        if (file?.status !== "Locked")
          throw new TemperError(`Imported File('${imported.fileId}') did not become Locked`, 502);
        return ok({
          file_id: imported.fileId,
          sha256: imported.sha256,
          mime_type: imported.mimeType,
          size_bytes: imported.sizeBytes,
          status: "Locked",
        });
      } catch (error) {
        return fail(error instanceof Error ? error.message : "ArtStyle proof import failed");
      }
    },
  );

  server.registerTool(
    "submit_art_style",
    {
      title: "Submit an art style",
      description:
        "Author a complete art-style Draft using one portable aesthetic prompt plus structured source, prompt-review, and contributor-supplied cross-model proof evidence. Katagami never generates submission images; its curator finalizer independently verifies the imported files and advances the Draft.",
      inputSchema: {
        entity_id: z.string().optional().describe("Existing draft (e.g. from remix); omit to create"),
        name: z.string(),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        medium: z.string().describe("Short medium noun: illustration | photography | painting | print | 3d | collage | mixed"),
        prompt_template: z
          .string()
          .trim()
          .min(1)
          .max(4000)
          .describe(
            "One paste-ready prompt made only of observable aesthetic facts and inline exclusions; no placeholders, catalog name, artist imitation, reference dependency, or model-specific variants",
          ),
        slot_recipes: z.record(z.string(), z.unknown()).describe("Per-slot prompt recipes"),
        guidance: z.string().optional(),
        proof_shots: z
          .array(artStyleProofInput)
          .length(8)
          .describe(
            "Two distinct image models × the same four contributor-supplied source images. Import all four sources and eight outputs first; bind their exact hashes and the canonical prompt hash in each generation_record.",
          ),
        thumbnail_file_id: z
          .string()
          .min(1)
          .describe(
            "Choose the strongest thumbnail from the eight verified proof file_ids; no semantic role is forced across styles",
          ),
        source_basis: z
          .record(z.string(), z.unknown())
          .describe(
            "Schema-v1 independent source and rights review; it must check every named person, reject named or hidden living-artist targeting, and attest that the recipe is described at tradition level",
          ),
        prompt_review: z
          .record(z.string(), z.unknown())
          .describe(
            "Schema-v1 independent semantic review of this exact prompt, including source_medium_independent=true; quote substantive clauses for medium/material, marks/edges, tonal/shading, color roles, composition, signature details, and exclusions in that canonical order",
          ),
        portability_report: z
          .record(z.string(), z.unknown())
          .describe(
            "Schema-v1 blind cross-model scores over the exact eight imported File ids and generation records.",
          ),
        tags: z.array(z.string()).optional(),
        direction_id: z.string().optional(),
        curator_notes: z.string().optional(),
        ...lineageInput,
        model_provenance: z.object({
          style: z.object({ model: z.string(), provider: z.string() }),
          source: z.object({ model: z.string(), provider: z.string() }),
          images: z
            .array(
              z
                .object({
                  model: z.string(),
                  provider: z.string(),
                  tool: z.string().optional(),
                })
                .passthrough(),
            )
            .length(2),
        }),
        credits: z
          .array(
            z
              .object({
                name: z.string(),
                kind: z.string(),
                note: z.string().optional(),
              })
              .passthrough(),
          )
          .min(1),
      },
    },
    async (a) => {
      const set = KINDS.art_style.set;
      if (a.entity_id && !(await getEntity(id, set, a.entity_id)))
        return fail(`Draft '${a.entity_id}' does not exist.`);
      const entityId = a.entity_id ?? (await createEntity(id, set));

      const proofIds = a.proof_shots.map((proof) => proof.file_id);
      if (!proofIds.includes(a.thumbnail_file_id))
        return fail("thumbnail_file_id must identify one of the eight verified proof shots.");
      const thumbId = a.thumbnail_file_id;

      await action(id, set, entityId, "SubmitArtStyle", {
        name: a.name,
        slug: a.slug,
        medium: a.medium,
        prompt_template: a.prompt_template,
        slot_recipes: asJsonString(a.slot_recipes),
        guidance: a.guidance ?? "",
        reference_image_file_ids: [],
        reference_manifest: asJsonString({ items: [] }),
        proof_shots_file_ids: proofIds,
        proof_shots_manifest: asJsonString({
          schema_version: "3",
          items: a.proof_shots,
        }),
        thumbnail_file_id: thumbId,
        parent_ids: a.parent_ids ?? [],
        lineage_type: a.lineage_type ?? (a.parent_ids?.length ? "remix" : "original"),
        generation_number: a.generation_number ?? (a.parent_ids?.length ? 1 : 0),
        model_provenance: asJsonString(a.model_provenance),
        credits: asJsonString(a.credits),
        source_basis: asJsonString(a.source_basis),
        prompt_review: asJsonString(a.prompt_review),
        portability_report: asJsonString(a.portability_report),
        tags: a.tags ?? [],
        direction_id: a.direction_id ?? "",
        curator_notes: a.curator_notes ?? "",
      });
      await setCreator(id, set, entityId);
      return ok({
        entity_id: entityId,
        status: "Draft",
        attributed_to: id.email,
        url: galleryUrl("art_style", entityId),
        governed_files: { proof_shots: proofIds, thumbnail: thumbId },
        next:
          "The curator finalizer must independently verify the exact prompt, rights basis, imported file hashes, and proof matrix before advancing this Draft.",
      });
    },
  );

  server.registerTool(
    "submit_palette_system",
    {
      title: "Submit a palette system",
      description:
        "Author a complete palette system and submit it for curator review. Lands UnderReview.",
      inputSchema: {
        entity_id: z.string().optional(),
        name: z.string(),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        signature: z.record(z.string(), z.unknown()).describe("Signature colors — the palette's identity"),
        neutrals: z.record(z.string(), z.unknown()),
        semantic: z.record(z.string(), z.unknown()).describe("error/warning/success/info — small, never primary"),
        mood: z.string().optional(),
        ramps: z.record(z.string(), z.unknown()),
        proof_scenes: z.record(z.string(), z.unknown()).describe("Scenes proving the palette works in real UI"),
        usage_guidance: z.string().optional(),
        thumbnail_url: z.string(),
        tags: z.array(z.string()).optional(),
        direction_id: z.string().optional(),
        curator_notes: z.string().optional(),
        ...lineageInput,
        ...provenanceInput,
      },
    },
    async (a) => {
      const set = KINDS.palette.set;
      if (a.entity_id && !(await getEntity(id, set, a.entity_id)))
        return fail(`Draft '${a.entity_id}' does not exist.`);
      const entityId = a.entity_id ?? (await createEntity(id, set));
      const thumbId = await ingestImage(id, a.thumbnail_url, `${a.slug}-thumb`);

      await action(id, set, entityId, "SubmitPaletteSystem", {
        name: a.name,
        slug: a.slug,
        signature: asJsonString(a.signature),
        neutrals: asJsonString(a.neutrals),
        semantic: asJsonString(a.semantic),
        mood: a.mood ?? "",
        ramps: asJsonString(a.ramps),
        proof_scenes: asJsonString(a.proof_scenes),
        usage_guidance: a.usage_guidance ?? "",
        tokens_export_file_id: "",
        tokens_export_format_version: "",
        tokens_export_manifest: "",
        thumbnail_file_id: thumbId,
        parent_ids: a.parent_ids ?? [],
        lineage_type: a.lineage_type ?? (a.parent_ids?.length ? "remix" : "original"),
        generation_number: a.generation_number ?? (a.parent_ids?.length ? 1 : 0),
        model_provenance: asJsonString(a.model_provenance ?? {}),
        credits: asJsonString(a.credits ?? {}),
        tags: a.tags ?? [],
        direction_id: a.direction_id ?? "",
        curator_notes: a.curator_notes ?? "",
      });
      await setCreator(id, set, entityId);
      await action(id, set, entityId, "SubmitForReview", {});
      return ok({
        entity_id: entityId,
        status: "UnderReview",
        attributed_to: id.email,
        url: galleryUrl("palette", entityId),
      });
    },
  );

  server.registerTool(
    "submit_design_language",
    {
      title: "Submit a design language",
      description:
        "Author a complete design language and submit it for curator review. Requires the full artifact set (embodiment, landing, dashboard, DESIGN.md, shadcn trio, thumbnail) — the same bar the pipeline meets; there is no lower side door. Lands UnderReview.",
      inputSchema: {
        entity_id: z.string().optional(),
        name: z.string(),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        philosophy: z.record(z.string(), z.unknown()),
        tokens: z.record(z.string(), z.unknown()).describe("colors/typography/spacing/radii/shadows/surfaces/borders/motion"),
        rules: z.record(z.string(), z.unknown()),
        layout_principles: z.record(z.string(), z.unknown()),
        guidance: z.record(z.string(), z.unknown()),
        imagery_direction: z.record(z.string(), z.unknown()).optional(),
        embodiment_html: z.string().describe("Self-contained HTML rendering the canonical elements"),
        element_count: z.number().int().min(1),
        composition_count: z.number().int().min(0),
        landing_html: z.string().describe("Palette-swap-ready landing page (role CSS vars, var(--hero-image))"),
        dashboard_html: z.string(),
        design_md: z.string().describe("Portable DESIGN.md projection with YAML token front matter"),
        shadcn_export: z.string().describe("shadcn theme export (JSON/text)"),
        shadcn_component_spec: z.string(),
        shadcn_preview_shots_url: z.string().describe("https image URL of the shadcn preview shots"),
        thumbnail_url: z.string(),
        tags: z.array(z.string()).optional(),
        direction_id: z.string().optional(),
        curator_notes: z.string().optional(),
        ...lineageInput,
        ...provenanceInput,
      },
    },
    async (a) => {
      const set = KINDS.language.set;
      if (a.entity_id && !(await getEntity(id, set, a.entity_id)))
        return fail(`Draft '${a.entity_id}' does not exist.`);
      const entityId = a.entity_id ?? (await createEntity(id, set));

      const embodimentId = await uploadFile(id, `${a.slug}-embodiment.html`, "text/html", a.embodiment_html);
      const landingId = await uploadFile(id, `${a.slug}-landing.html`, "text/html", a.landing_html);
      const dashboardId = await uploadFile(id, `${a.slug}-dashboard.html`, "text/html", a.dashboard_html);
      const designMdId = await uploadFile(id, `${a.slug}-DESIGN.md`, "text/markdown", a.design_md);
      const shadcnExportId = await uploadFile(id, `${a.slug}-shadcn-export.json`, "application/json", a.shadcn_export);
      const shadcnSpecId = await uploadFile(id, `${a.slug}-shadcn-spec.json`, "application/json", a.shadcn_component_spec);
      const shadcnShotsId = await ingestImage(id, a.shadcn_preview_shots_url, `${a.slug}-shadcn-shots`);
      const thumbId = await ingestImage(id, a.thumbnail_url, `${a.slug}-thumb`);

      await action(id, set, entityId, "SubmitDesignLanguage", {
        name: a.name,
        slug: a.slug,
        philosophy: asJsonString(a.philosophy),
        tokens: asJsonString(a.tokens),
        rules: asJsonString(a.rules),
        layout_principles: asJsonString(a.layout_principles),
        guidance: asJsonString(a.guidance),
        tags: a.tags ?? [],
        imagery_direction: asJsonString(a.imagery_direction ?? {}),
        embodiment_file_id: embodimentId,
        element_count: a.element_count,
        composition_count: a.composition_count,
        embodiment_format: "html",
        landing_file_id: landingId,
        dashboard_file_id: dashboardId,
        design_md_file_id: designMdId,
        design_md_lint_result: "",
        design_md_format_version: "v1",
        shadcn_export_file_id: shadcnExportId,
        shadcn_export_format_version: "v1",
        shadcn_export_manifest: "",
        shadcn_component_spec_file_id: shadcnSpecId,
        shadcn_component_spec_format_version: "v1",
        shadcn_component_spec_manifest: "",
        shadcn_preview_shots_file_id: shadcnShotsId,
        shadcn_preview_shots_format_version: "v1",
        shadcn_preview_shots_manifest: "",
        thumbnail_file_id: thumbId,
        parent_ids: a.parent_ids ?? [],
        lineage_type: a.lineage_type ?? (a.parent_ids?.length ? "remix" : "original"),
        generation_number: a.generation_number ?? (a.parent_ids?.length ? 1 : 0),
        model_provenance: asJsonString(a.model_provenance ?? {}),
        provenance_tier: "",
        provenance: "",
        direction_id: a.direction_id ?? "",
        curator_notes: a.curator_notes ?? "",
      });
      await setCreator(id, set, entityId);
      await action(id, set, entityId, "SubmitForReview", {});
      return ok({
        entity_id: entityId,
        status: "UnderReview",
        attributed_to: id.email,
        url: galleryUrl("language", entityId),
      });
    },
  );

  server.registerTool(
    "submission_status",
    {
      title: "Submission status",
      description: "Lifecycle state and review status of a submission (yours or anyone's).",
      inputSchema: { kind: kindSchema, id: z.string() },
    },
    async ({ kind, id: entityId }) => {
      const row = await getEntity(id, KINDS[kind as Kind].set, entityId);
      if (!row) return fail(`No ${kind} with id '${entityId}'.`);
      const f = row.fields ?? {};
      return ok({
        ...summarize(row),
        review_status: (f.review_status as string) ?? "",
        curator_notes: (f.curator_notes as string) ?? "",
        url: galleryUrl(kind as Kind, entityId),
      });
    },
  );

  return server;
}
