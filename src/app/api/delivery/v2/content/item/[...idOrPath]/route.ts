import { checkApiKey, contentToApi, findByIdOrPath, json, loadDeliveryContext } from "@/lib/delivery";

export const dynamic = "force-dynamic";

/** GET /api/delivery/v2/content/item/{id}  or  /item/{path/to/page} */
export async function GET(req: Request, { params }: { params: Promise<{ idOrPath: string[] }> }) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const { idOrPath } = await params;
  const ctx = await loadDeliveryContext();
  const doc = findByIdOrPath(idOrPath.map(decodeURIComponent).join("/"), ctx);
  if (!doc) return json({ title: "Not found", status: 404 }, 404);
  return json(contentToApi(doc, ctx));
}
