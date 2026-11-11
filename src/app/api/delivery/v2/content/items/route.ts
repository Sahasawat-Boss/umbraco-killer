import { checkApiKey, contentToApi, findByIdOrPath, json, loadDeliveryContext } from "@/lib/delivery";

export const dynamic = "force-dynamic";

/** GET /api/delivery/v2/content/items?id=..&id=.. */
export async function GET(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const ctx = await loadDeliveryContext();
  const ids = new URL(req.url).searchParams.getAll("id");
  return json(ids.map((id) => findByIdOrPath(id, ctx)).filter(Boolean).map((d) => contentToApi(d!, ctx)));
}
