import { db } from "@/lib/db";
import { checkApiKey, json, mediaToApi } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const { id } = await params;
  const m = await db.media.findFirst({ where: { id, trashed: false } });
  if (!m) return json({ title: "Not found", status: 404 }, 404);
  return json(mediaToApi(m));
}
