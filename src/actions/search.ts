"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type SearchHit = { id: string; name: string; icon: string; href: string; group: string; detail?: string };

export async function searchAll(q: string): Promise<SearchHit[]> {
  const user = await requireUser();
  const term = q.trim();
  if (term.length < 1) return [];
  const contains = { contains: term, mode: "insensitive" as const };
  const [docs, media, types, dataTypes] = await Promise.all([
    db.document.findMany({ where: { name: contains, trashed: false }, include: { documentType: true }, take: 8 }),
    db.media.findMany({ where: { name: contains, trashed: false }, take: 6 }),
    user.role === "admin" ? db.documentType.findMany({ where: { OR: [{ name: contains }, { alias: contains }] }, take: 5 }) : [],
    user.role === "admin" ? db.dataType.findMany({ where: { name: contains }, take: 5 }) : [],
  ]);
  return [
    ...docs.map((d) => ({
      id: d.id,
      name: d.name,
      icon: d.documentType.icon,
      href: `/umbraco/section/content/edit/${d.id}`,
      group: "Documents",
      detail: d.documentType.name,
    })),
    ...media.map((m) => ({
      id: m.id,
      name: m.name,
      icon: m.mediaType === "Folder" ? "Folder" : m.mediaType === "Image" ? "Image" : "File",
      href: `/umbraco/section/media/${m.id}`,
      group: "Media",
      detail: m.mediaType,
    })),
    ...types.map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      href: `/umbraco/section/settings/document-types/${t.id}`,
      group: "Document Types",
      detail: t.alias,
    })),
    ...dataTypes.map((t) => ({
      id: t.id,
      name: t.name,
      icon: "Database",
      href: `/umbraco/section/settings/data-types/${t.id}`,
      group: "Data Types",
      detail: t.editorAlias,
    })),
  ];
}
