import { db } from "./db";
import { computeRoutes, normalizePath } from "./routes";
import { asObject, type JsonObject } from "./utils";
import { asBlocks } from "./editors";
import { sanitizeRichText } from "./sanitize";

/** Loads everything the Delivery API needs in a few queries (fine for small/medium sites). */
export async function loadDeliveryContext() {
  const [docs, types, media] = await Promise.all([
    db.document.findMany({ where: { trashed: false }, orderBy: { sortOrder: "asc" } }),
    db.documentType.findMany({
      include: {
        groups: {
          orderBy: { sortOrder: "asc" },
          include: { properties: { orderBy: { sortOrder: "asc" }, include: { dataType: true } } },
        },
      },
    }),
    db.media.findMany({ where: { trashed: false } }),
  ]);
  const { routeById, idByRoute } = computeRoutes(docs, true);
  const typeById = new Map(types.map((t) => [t.id, t]));
  const docById = new Map(docs.map((d) => [d.id, d]));
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const published = docs.filter((d) => d.published && routeById.has(d.id));
  return { docs, published, routeById, idByRoute, typeById, docById, mediaById };
}

export type DeliveryContext = Awaited<ReturnType<typeof loadDeliveryContext>>;
type Doc = DeliveryContext["docs"][number];
type MediaItem = DeliveryContext["mediaById"] extends Map<string, infer M> ? M : never;

export function mediaToApi(m: MediaItem) {
  return {
    id: m.id,
    name: m.name,
    mediaType: m.mediaType,
    url: m.filePath ? `/media/${m.filePath}` : null,
    extension: m.fileName?.split(".").pop() ?? null,
    width: m.width,
    height: m.height,
    bytes: m.size,
    altText: m.altText,
    properties: {},
  };
}

function rootOf(doc: Doc, ctx: DeliveryContext) {
  let cur: Doc | undefined = doc;
  while (cur?.parentId) cur = ctx.docById.get(cur.parentId);
  return cur ?? doc;
}

function linkTo(id: string, ctx: DeliveryContext) {
  const d = ctx.docById.get(id);
  if (!d || !d.published || !ctx.routeById.has(id)) return null;
  return {
    id: d.id,
    name: d.publishedName ?? d.name,
    contentType: ctx.typeById.get(d.documentTypeId)?.alias,
    route: { path: ctx.routeById.get(id)! },
  };
}

type DocType = DeliveryContext["typeById"] extends Map<string, infer T> ? T : never;

/** Umbraco-style Block List output: { items: [{ content: { contentType, id, properties }, settings }] } */
export type ApiBlockList = {
  items: { content: { contentType: string; id: string; properties: JsonObject }; settings: null }[];
};

function mapProperties(type: DocType | undefined, values: JsonObject, ctx: DeliveryContext, expand: boolean): JsonObject {
  const properties: JsonObject = {};
  for (const g of type?.groups ?? []) {
    for (const p of g.properties) {
      const v = values[p.alias];
      const cfg = asObject(p.dataType.config);
      switch (p.dataType.editorAlias) {
        case "Killer.MediaPicker": {
          const ids = Array.isArray(v) ? (v as string[]) : v ? [String(v)] : [];
          const items = ids.map((id) => ctx.mediaById.get(id)).filter(Boolean).map((m) => mediaToApi(m!));
          properties[p.alias] = cfg.multiple ? items : (items[0] ?? null);
          break;
        }
        case "Killer.ContentPicker": {
          const ids = Array.isArray(v) ? (v as string[]) : v ? [String(v)] : [];
          const items = expand ? ids.map((id) => linkTo(id, ctx)).filter(Boolean) : ids;
          properties[p.alias] = cfg.multiple ? items : (items[0] ?? null);
          break;
        }
        case "Killer.RichText":
          properties[p.alias] = { markup: sanitizeRichText(v), blocks: [] };
          break;
        case "Killer.BlockList": {
          const items: ApiBlockList["items"] = [];
          for (const b of asBlocks(v)) {
            const et = ctx.typeById.get(b.contentTypeId);
            if (b.hidden || !et) continue;
            items.push({ content: { contentType: et.alias, id: b.key, properties: mapProperties(et, b.values, ctx, expand) }, settings: null });
          }
          properties[p.alias] = { items } satisfies ApiBlockList;
          break;
        }
        default:
          properties[p.alias] = v ?? null;
      }
    }
  }
  return properties;
}

export function contentToApi(doc: Doc, ctx: DeliveryContext, expand = true) {
  const type = ctx.typeById.get(doc.documentTypeId);
  const properties = mapProperties(type, asObject(doc.publishedValues), ctx, expand);
  const root = rootOf(doc, ctx);
  return {
    id: doc.id,
    name: doc.publishedName ?? doc.name,
    contentType: type?.alias ?? null,
    createDate: doc.createdAt.toISOString(),
    updateDate: (doc.publishedAt ?? doc.updatedAt).toISOString(),
    route: { path: ctx.routeById.get(doc.id) ?? null, startItem: { id: root.id, path: root.urlSegment } },
    properties,
  };
}

export function findByIdOrPath(idOrPath: string, ctx: DeliveryContext) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrPath)) {
    const d = ctx.docById.get(idOrPath);
    return d && d.published && ctx.routeById.has(d.id) ? d : null;
  }
  const id = ctx.idByRoute.get(normalizePath(idOrPath));
  return id ? ctx.docById.get(id) ?? null : null;
}

export function checkApiKey(req: Request): Response | null {
  const key = process.env.DELIVERY_API_KEY;
  if (!key) return null;
  if (req.headers.get("api-key") === key) return null;
  return Response.json({ title: "Unauthorized", status: 401, detail: "A valid Api-Key header is required" }, { status: 401 });
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}
