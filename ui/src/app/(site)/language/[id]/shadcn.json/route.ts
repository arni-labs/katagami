import { NextResponse } from "next/server";
import { getDesignLanguage } from "@/lib/odata";
import { readTemperFileBytes } from "@/lib/temper-files";
import {
  buildShadcnRegistryTheme,
  shadcnThemeToJson,
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
  const filename = f.slug ? `${f.slug}-shadcn.json` : "shadcn.json";
  const storedStatus =
    lang.booleans?.has_shadcn_export && lang.booleans?.shadcn_export_verified
      ? "validated"
      : "stored-unverified";

  if (f.shadcn_export_file_id) {
    const stored = await readTemperFileBytes(f.shadcn_export_file_id);
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

  const theme = buildShadcnRegistryTheme({
    languageId: id,
    name: f.name,
    slug: f.slug,
    tokens: f.tokens,
  });

  return new NextResponse(shadcnThemeToJson(theme), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-katagami-shadcn-status": "generated-preview",
    },
  });
}
