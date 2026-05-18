import { NextResponse } from "next/server";
import { getDesignLanguage } from "@/lib/odata";
import { shadcnPreviewShotsJson } from "@/lib/shadcn-export";

function cleanEnv(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? fallback).replace(/\\n/g, "").trim();
  return cleaned || fallback;
}

const API_BASE = cleanEnv(
  process.env.NEXT_PUBLIC_TEMPER_API_URL,
  "http://localhost:3500",
);
const TENANT = cleanEnv(process.env.NEXT_PUBLIC_TEMPER_TENANT, "default");
const API_KEY = cleanEnv(process.env.TEMPER_API_KEY, "");

export const dynamic = "force-dynamic";

async function readStoredFile(fileId: string): Promise<ArrayBuffer | null> {
  const fetchHeaders: Record<string, string> = { "X-Tenant-Id": TENANT };
  if (API_KEY) fetchHeaders.Authorization = `Bearer ${API_KEY}`;

  const res = await fetch(`${API_BASE}/tdata/Files('${fileId}')/$value`, {
    headers: fetchHeaders,
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.arrayBuffer();
}

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
    const stored = await readStoredFile(f.shadcn_preview_shots_file_id);
    if (stored) {
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
    },
  });
}
