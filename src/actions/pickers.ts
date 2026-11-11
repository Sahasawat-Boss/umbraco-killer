"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type PickerDoc = { id: string; parentId: string | null; name: string; icon: string; published: boolean };
export type PickerMedia = {
  id: string;
  parentId: string | null;
  name: string;
  mediaType: string;
  url: string | null;
  width: number | null;
  height: number | null;
};

export async function listDocumentsForPicker(): Promise<PickerDoc[]> {
  await requireUser();
  const docs = await db.document.findMany({
    where: { trashed: false },
    include: { documentType: { select: { icon: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return docs.map((d) => ({ id: d.id, parentId: d.parentId, name: d.name, icon: d.documentType.icon, published: d.published }));
}

export async function listMediaForPicker(): Promise<PickerMedia[]> {
  await requireUser();
  const media = await db.media.findMany({ where: { trashed: false }, orderBy: [{ mediaType: "asc" }, { name: "asc" }] });
  return media.map((m) => ({
    id: m.id,
    parentId: m.parentId,
    name: m.name,
    mediaType: m.mediaType,
    url: m.filePath ? `/media/${m.filePath}` : null,
    width: m.width,
    height: m.height,
  }));
}
