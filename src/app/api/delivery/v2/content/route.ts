import { checkApiKey, contentToApi, findByIdOrPath, json, loadDeliveryContext, type DeliveryContext } from "@/lib/delivery";

export const dynamic = "force-dynamic";

type Doc = DeliveryContext["docs"][number];

/**
 * Query content — mirrors Umbraco's Delivery API v2:
 *   fetch=children:{id|path} | descendants:{id|path} | ancestors:{id|path}
 *   filter=contentType:{alias} | name:{text}   (repeatable, prefix value with ! to negate)
 *   sort=createDate|updateDate|name|sortOrder|level:{asc|desc}
 *   skip, take
 */
export async function GET(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const ctx = await loadDeliveryContext();
  let items: Doc[] = ctx.published;

  const fetch = url.searchParams.get("fetch");
  if (fetch) {
    const [kind, ref = "/"] = fetch.split(/:(.*)/s);
    const target = ref === "/" ? null : findByIdOrPath(ref, ctx);
    if (ref !== "/" && !target) return json({ total: 0, items: [] });
    const isDesc = (d: Doc, ancestorId: string | null) => {
      let cur = d.parentId;
      if (ancestorId === null) return true;
      while (cur) {
        if (cur === ancestorId) return true;
        cur = ctx.docById.get(cur)?.parentId ?? null;
      }
      return false;
    };
    if (kind === "children") {
      // "children:/" means children of the first root node, like Umbraco without Start-Item
      const parentId = target?.id ?? ctx.published.find((d) => d.parentId === null)?.id ?? null;
      items = items.filter((d) => d.parentId === parentId);
    } else if (kind === "descendants") {
      items = items.filter((d) => d.id !== target?.id && isDesc(d, target?.id ?? null));
    } else if (kind === "ancestors" && target) {
      const ids: string[] = [];
      let cur = target.parentId;
      while (cur) {
        ids.push(cur);
        cur = ctx.docById.get(cur)?.parentId ?? null;
      }
      items = items.filter((d) => ids.includes(d.id));
    } else {
      return json({ title: "Bad request", status: 400, detail: `Unsupported fetch "${fetch}"` }, 400);
    }
  }

  for (const f of url.searchParams.getAll("filter")) {
    const [field, raw = ""] = f.split(/:(.*)/s);
    const negate = raw.startsWith("!");
    const value = (negate ? raw.slice(1) : raw).toLowerCase();
    const values = value.split(",");
    items = items.filter((d) => {
      let hit = true;
      if (field === "contentType") hit = values.includes(ctx.typeById.get(d.documentTypeId)?.alias.toLowerCase() ?? "");
      else if (field === "name") hit = (d.publishedName ?? d.name).toLowerCase().includes(value);
      return negate ? !hit : hit;
    });
  }

  const level = (d: Doc) => {
    let n = 0;
    let cur = d.parentId;
    while (cur) { n++; cur = ctx.docById.get(cur)?.parentId ?? null; }
    return n;
  };
  for (const s of url.searchParams.getAll("sort").reverse()) {
    const [field, dir = "asc"] = s.split(":");
    const m = dir.toLowerCase() === "desc" ? -1 : 1;
    const key = (d: Doc): string | number =>
      field === "createDate" ? d.createdAt.getTime()
      : field === "updateDate" ? (d.publishedAt ?? d.updatedAt).getTime()
      : field === "name" ? (d.publishedName ?? d.name).toLowerCase()
      : field === "level" ? level(d)
      : d.sortOrder;
    items = [...items].sort((a, b) => (key(a) > key(b) ? m : key(a) < key(b) ? -m : 0));
  }

  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const take = Math.min(100, Math.max(0, Number(url.searchParams.get("take") ?? 10) || 10));
  return json({ total: items.length, items: items.slice(skip, skip + take).map((d) => contentToApi(d, ctx)) });
}
