import { db } from "./db";
import type { MediaRow } from "@/components/backoffice/MediaViews";

export async function getAllMedia(): Promise<MediaRow[]> {
  const items = await db.media.findMany({ where: { trashed: false }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return items.map((m) => ({
    id: m.id,
    parentId: m.parentId,
    name: m.name,
    mediaType: m.mediaType,
    url: m.filePath ? `/media/${m.filePath}` : null,
    size: m.size,
    width: m.width,
    height: m.height,
    mimeType: m.mimeType,
    altText: m.altText,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));
}

export function mediaCrumbs(all: MediaRow[], parentId: string | null) {
  const chain: { name: string; href: string }[] = [];
  let cur = parentId;
  while (cur) {
    const f = all.find((m) => m.id === cur);
    if (!f) break;
    chain.unshift({ name: f.name, href: `/umbraco/section/media/${f.id}` });
    cur = f.parentId;
  }
  return [{ name: "Media", href: "/umbraco/section/media" }, ...chain];
}
