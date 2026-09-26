import { readFile } from "node:fs/promises";
import path from "node:path";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";

// The code-style modules, subjects and recipes (ui/code-styles). Owner-only while the first
// styles are reviewed; to open them to everyone, drop the check below.

const ROOT = path.join(process.cwd(), "code-styles");
const TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

export const dynamic = "force-dynamic";

const missing = () => new Response("Not found", { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await isOwner()) && !labPreviewAllowed()) return missing();
  const { path: parts } = await params;
  const file = path.join(ROOT, ...parts);
  const type = TYPES[path.extname(file)];
  if (!file.startsWith(ROOT + path.sep) || !type) return missing();
  try {
    const body = await readFile(file);
    return new Response(body, { headers: { "content-type": type, "cache-control": "private, no-store" } });
  } catch {
    return missing();
  }
}
