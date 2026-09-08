import { NextResponse } from "next/server";
import { getWritingStyle, getFileText } from "@/lib/odata";
import { isOwner } from "@/lib/owner";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

// The portable projection of a writing style, at the address the spec promises
// (`/voice/<id>/VOICE.md`). Same visibility as the voice page: the owner sees
// every voice; a Published voice is readable by any signed-in viewer.
export const dynamic = "force-dynamic";

const plain = (text: string, status: number) =>
  new NextResponse(`${text}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" },
  });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ws;
  try {
    ws = await getWritingStyle(id);
  } catch {
    return plain("writing style not found", 404);
  }
  const owner = await isOwner();
  const published = ws.status === "Published" && (await hasFullGalleryAccess());
  if (!owner && !published) return plain("writing style not found", 404);

  const fileId = ws.fields.voice_md_file_id ?? "";
  const body = fileId ? (await getFileText(fileId)).trim() : "";
  if (!body) return plain("this writing style has no VOICE.md yet", 404);

  const slug = ws.fields.slug || id;
  return new NextResponse(`${body}\n`, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${slug}-VOICE.md"`,
      "cache-control": "private, no-store",
    },
  });
}
