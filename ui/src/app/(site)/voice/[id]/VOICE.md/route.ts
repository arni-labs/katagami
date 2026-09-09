import { NextResponse } from "next/server";
import { getWritingStyle, getFileText } from "@/lib/odata";
import { isOwner } from "@/lib/owner";

// The portable projection of a writing style, at the address the spec promises
// (`/voice/<id>/VOICE.md`). Exactly the voice page's rule (page.tsx): the owner,
// and nobody else, until the writing lane's publication is settled.
export const dynamic = "force-dynamic";

const plain = (text: string, status: number) =>
  new NextResponse(`${text}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" },
  });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isOwner())) return plain("writing style not found", 404);
  let ws;
  try {
    ws = await getWritingStyle(id);
  } catch {
    return plain("writing style not found", 404);
  }

  const fileId = ws.fields.voice_md_file_id ?? "";
  const body = fileId ? (await getFileText(fileId)).trim() : "";
  if (!body) return plain(fileId ? "VOICE.md could not be read" : "this writing style has no VOICE.md", 404);

  const slug = (ws.fields.slug || id).replace(/[^A-Za-z0-9._-]/g, "-");
  return new NextResponse(`${body}\n`, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${slug}-VOICE.md"`,
      "cache-control": "private, no-store",
    },
  });
}
