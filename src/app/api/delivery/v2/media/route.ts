import { db } from "@/lib/db";
import { checkApiKey, json, mediaToApi } from "@/lib/delivery";

export const dynamic = "force-dynamic";

/** GET /api/delivery/v2/media?fetch=children:/ | children:{folderId}&skip&take */
export async function GET(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const fetch = url.searchParams.get("fetch") ?? "children:/";
  const ref = fetch.replace(/^children:/, "");
  const parentId = ref === "/" ? null : ref;
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const take = Math.min(100, Number(url.searchParams.get("take") ?? 10) || 10);
  const where = { trashed: false, parentId };
  const [total, items] = await Promise.all([
    db.media.count({ where }),
    db.media.findMany({ where, skip, take, orderBy: { name: "asc" } }),
  ]);
  return json({ total, items: items.map(mediaToApi) });
}
