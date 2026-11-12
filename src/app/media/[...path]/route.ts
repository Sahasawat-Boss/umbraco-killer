import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { safeDecode } from "@/lib/utils";

const ROOT = path.join(process.cwd(), "uploads");
const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".avif": "image/avif", ".pdf": "application/pdf", ".mp4": "video/mp4", ".txt": "text/plain",
};

/** Serves uploaded media files from ./uploads */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const file = path.join(ROOT, ...parts.map(safeDecode));
  if (!file.startsWith(ROOT + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error();
    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        // SVGs can contain scripts — sandbox them
        ...(ext === ".svg" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
