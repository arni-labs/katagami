import { NextResponse } from "next/server";
import { getDesignLanguage } from "@/lib/odata";
import { readTemperFileBytes } from "@/lib/temper-files";
import {
  isAgentAuthoredShadcnPreviewShots,
  isRenderableShadcnPreviewShots,
  shadcnPreviewShotsJson,
} from "@/lib/shadcn-export";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let lang;
  try {
    lang = await getDesignLanguage(id);
  } catch {
    return new NextResponse("design language not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const f = lang.fields;
  const filename = f.slug
    ? `${f.slug}-shadcn-shots.json`
    : "shadcn-shots.json";
  const storedStatus =
    lang.booleans?.has_shadcn_preview_shots &&
    lang.booleans?.shadcn_preview_shots_verified
      ? "validated"
      : "stored-unverified";

  if (f.shadcn_preview_shots_file_id) {
    const stored = await readTemperFileBytes(f.shadcn_preview_shots_file_id);
    if (stored) {
      try {
        const storedJson = JSON.parse(new TextDecoder().decode(stored));
        if (
          isRenderableShadcnPreviewShots(storedJson) &&
          isAgentAuthoredShadcnPreviewShots(storedJson)
        ) {
          return new NextResponse(stored, {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "content-disposition": `inline; filename="${filename}"`,
              "cache-control": "public, max-age=60, s-maxage=300",
              "x-katagami-shadcn-status": storedStatus,
            },
          });
        }
      } catch {
        // Fall through to the deterministic preview. The stored artifact exists,
        // but it is not renderable enough to present as a verified shot contract.
      }
    }
  }

  const shots = shadcnPreviewShotsJson({
    languageId: id,
    name: f.name,
    slug: f.slug,
    philosophy: f.philosophy,
    rules: f.rules,
    guidance: f.guidance,
  });

  return new NextResponse(shots, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-katagami-shadcn-status": "generated-preview",
      "x-katagami-shadcn-stored-status": f.shadcn_preview_shots_file_id
        ? "invalid-stored"
        : "missing-stored",
    },
  });
}
