"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canDelete, canPublish, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { cleanValues, loadDocType, loadElementTypes, uniqueSegment, validate } from "@/lib/content-values";
import { asObject, type JsonObject } from "@/lib/utils";

export type SaveResult = { ok: boolean; id?: string; error?: string; errors?: Record<string, string> };

async function uniqueName(name: string, parentId: string | null, excludeId?: string) {
  const siblings = await db.document.findMany({
    where: { parentId, trashed: false, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { name: true },
  });
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 1; ; i++) {
    const candidate = `${name} (${i})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

async function isAllowedUnder(documentTypeId: string, parentId: string | null) {
  if (!parentId) {
    const dt = await db.documentType.findUnique({ where: { id: documentTypeId } });
    return !!dt?.allowedAtRoot;
  }
  const parent = await db.document.findUnique({ where: { id: parentId }, include: { documentType: true } });
  return !!parent && parent.documentType.allowedChildIds.includes(documentTypeId);
}

function refresh() {
  revalidatePath("/umbraco", "layout");
  revalidatePath("/", "layout");
}

export async function saveDocument(input: {
  id?: string;
  parentId: string | null;
  documentTypeId: string;
  name: string;
  values: JsonObject;
  publish: boolean;
}): Promise<SaveResult> {
  const user = await requireUser();
  if (input.publish && !canPublish(user.role)) return { ok: false, error: "You don't have permission to publish." };
  const rawName = input.name.trim();
  if (!rawName) return { ok: false, error: "Please enter a name", errors: { $name: "Name is required" } };

  const existing = input.id ? await db.document.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) return { ok: false, error: "Document not found" };
  const docType = await loadDocType(existing?.documentTypeId ?? input.documentTypeId);
  if (!docType) return { ok: false, error: "Document Type not found" };

  const elements = await loadElementTypes();
  const values = cleanValues(docType, input.values, elements);
  const errors = validate(docType, values, elements);
  if (input.publish && Object.keys(errors).length) {
    return { ok: false, errors, error: "Publishing failed because some properties did not pass validation" };
  }

  const parentId = existing ? existing.parentId : input.parentId;
  if (!existing && !(await isAllowedUnder(docType.id, parentId))) {
    return { ok: false, error: `${docType.name} is not allowed at this location` };
  }
  const name = await uniqueName(rawName, parentId, existing?.id);

  const publishData = input.publish
    ? {
        published: true,
        edited: false,
        publishedName: name,
        publishedValues: values as object,
        publishedAt: new Date(),
      }
    : { edited: true };

  let id: string;
  if (existing) {
    await db.document.update({
      where: { id: existing.id },
      data: {
        name,
        urlSegment: await uniqueSegment(name, parentId, existing.id),
        values: values as object,
        updatedById: user.id,
        ...publishData,
      },
    });
    id = existing.id;
  } else {
    const max = await db.document.aggregate({ where: { parentId }, _max: { sortOrder: true } });
    const created = await db.document.create({
      data: {
        name,
        documentTypeId: docType.id,
        parentId,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        urlSegment: await uniqueSegment(name, parentId),
        values: values as object,
        createdById: user.id,
        updatedById: user.id,
        ...publishData,
      },
    });
    id = created.id;
    await audit("Document", id, "Create", user.id);
  }
  await db.contentVersion.create({
    data: { documentId: id, name, values: values as object, published: input.publish, userId: user.id },
  });
  await audit("Document", id, input.publish ? "Publish" : "Save", user.id);
  refresh();
  return { ok: true, id, errors: Object.keys(errors).length ? errors : undefined };
}

export async function unpublishDocument(id: string): Promise<SaveResult> {
  const user = await requireUser();
  if (!canPublish(user.role)) return { ok: false, error: "You don't have permission to unpublish." };
  await db.document.update({ where: { id }, data: { published: false, edited: true } });
  await audit("Document", id, "Unpublish", user.id);
  refresh();
  return { ok: true, id };
}

async function descendantIds(rootId: string) {
  const all = await db.document.findMany({ select: { id: true, parentId: true } });
  const ids: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    ids.push(cur);
    for (const d of all) if (d.parentId === cur) stack.push(d.id);
  }
  return ids;
}

export async function publishWithDescendants(id: string): Promise<SaveResult & { count?: number; failed?: string[] }> {
  const user = await requireUser();
  if (!canPublish(user.role)) return { ok: false, error: "You don't have permission to publish." };
  const ids = await descendantIds(id);
  const docs = await db.document.findMany({ where: { id: { in: ids }, trashed: false } });
  const failed: string[] = [];
  let count = 0;
  const elements = await loadElementTypes();
  for (const d of docs) {
    const dt = await loadDocType(d.documentTypeId);
    if (!dt) continue;
    const values = cleanValues(dt, asObject(d.values), elements);
    if (Object.keys(validate(dt, values, elements)).length) {
      failed.push(d.name);
      continue;
    }
    await db.document.update({
      where: { id: d.id },
      data: { published: true, edited: false, publishedName: d.name, values: values as object, publishedValues: values as object, publishedAt: new Date() },
    });
    await audit("Document", d.id, "Publish", user.id, "Published with descendants");
    count++;
  }
  refresh();
  return { ok: failed.length === 0, count, failed, error: failed.length ? `Could not publish: ${failed.join(", ")}` : undefined };
}

export async function trashDocument(id: string): Promise<SaveResult> {
  const user = await requireUser();
  if (!canDelete(user.role)) return { ok: false, error: "You don't have permission to delete content." };
  const ids = await descendantIds(id);
  await db.document.updateMany({ where: { id: { in: ids } }, data: { trashed: true, published: false } });
  await audit("Document", id, "Trash", user.id);
  refresh();
  return { ok: true };
}

export async function restoreDocument(id: string): Promise<SaveResult> {
  const user = await requireUser();
  const doc = await db.document.findUnique({ where: { id }, include: { parent: true } });
  if (!doc) return { ok: false, error: "Not found" };
  const ids = await descendantIds(id);
  await db.document.updateMany({ where: { id: { in: ids } }, data: { trashed: false } });
  // Restored under its old parent (or the root) — make sure name and URL don't clash with siblings
  const parentId = doc.parent?.trashed ? null : doc.parentId;
  await db.document.update({
    where: { id },
    data: {
      parentId,
      name: await uniqueName(doc.name, parentId, id),
      urlSegment: await uniqueSegment(doc.name, parentId, id),
    },
  });
  await audit("Document", id, "Restore", user.id);
  refresh();
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<SaveResult> {
  const user = await requireUser();
  if (!canDelete(user.role)) return { ok: false, error: "You don't have permission to delete content." };
  const doc = await db.document.findUnique({ where: { id }, select: { trashed: true } });
  if (!doc) return { ok: false, error: "Not found" };
  if (!doc.trashed) return { ok: false, error: "Only items in the Recycle Bin can be deleted permanently" };
  await db.document.delete({ where: { id } });
  await audit("Document", id, "Delete", user.id);
  refresh();
  return { ok: true };
}

export async function emptyRecycleBin(): Promise<SaveResult> {
  const user = await requireUser();
  if (!canDelete(user.role)) return { ok: false, error: "You don't have permission to empty the Recycle Bin." };
  const trashedRoots = await db.document.findMany({
    where: { trashed: true, OR: [{ parentId: null }, { parent: { trashed: false } }] },
    select: { id: true },
  });
  for (const r of trashedRoots) await db.document.delete({ where: { id: r.id } });
  await audit("Document", "recycle-bin", "Delete", user.id, "Emptied recycle bin");
  refresh();
  return { ok: true };
}

export async function moveDocument(id: string, newParentId: string | null): Promise<SaveResult> {
  const user = await requireUser();
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "Not found" };
  if (newParentId && (await descendantIds(id)).includes(newParentId)) {
    return { ok: false, error: "Cannot move an item into itself or one of its descendants" };
  }
  if (!(await isAllowedUnder(doc.documentTypeId, newParentId))) {
    return { ok: false, error: "The document type is not allowed at the selected location" };
  }
  const max = await db.document.aggregate({ where: { parentId: newParentId }, _max: { sortOrder: true } });
  await db.document.update({
    where: { id },
    data: {
      parentId: newParentId,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
      name: await uniqueName(doc.name, newParentId, id),
      urlSegment: await uniqueSegment(doc.name, newParentId, id),
    },
  });
  await audit("Document", id, "Move", user.id);
  refresh();
  return { ok: true, id };
}

export async function copyDocument(id: string, newParentId: string | null, includeDescendants: boolean): Promise<SaveResult> {
  const user = await requireUser();
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return { ok: false, error: "Not found" };
  if (!(await isAllowedUnder(doc.documentTypeId, newParentId))) {
    return { ok: false, error: "The document type is not allowed at the selected location" };
  }
  const all = includeDescendants ? await db.document.findMany({ where: { trashed: false } }) : [];

  const copyOne = async (src: typeof doc, parentId: string | null): Promise<string> => {
    const name = await uniqueName(src.name, parentId);
    const max = await db.document.aggregate({ where: { parentId }, _max: { sortOrder: true } });
    const c = await db.document.create({
      data: {
        name,
        documentTypeId: src.documentTypeId,
        parentId,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        urlSegment: await uniqueSegment(name, parentId),
        values: src.values as object,
        published: false,
        edited: true,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    if (includeDescendants) {
      for (const child of all.filter((d) => d.parentId === src.id).sort((a, b) => a.sortOrder - b.sortOrder)) {
        await copyOne(child, c.id);
      }
    }
    return c.id;
  };
  const newId = await copyOne(doc, newParentId);
  await audit("Document", newId, "Copy", user.id, `Copied from ${doc.name}`);
  refresh();
  return { ok: true, id: newId };
}

export async function sortDocuments(orderedIds: string[]): Promise<SaveResult> {
  const user = await requireUser();
  await db.$transaction(orderedIds.map((id, i) => db.document.update({ where: { id }, data: { sortOrder: i } })));
  if (orderedIds[0]) await audit("Document", orderedIds[0], "Sort", user.id, "Sorted children");
  refresh();
  return { ok: true };
}

export async function rollbackDocument(id: string, versionId: string): Promise<SaveResult> {
  const user = await requireUser();
  const v = await db.contentVersion.findUnique({ where: { id: versionId } });
  if (!v || v.documentId !== id) return { ok: false, error: "Version not found" };
  const doc = await db.document.findUnique({ where: { id } });
  const docType = doc && (await loadDocType(doc.documentTypeId));
  if (!doc || !docType) return { ok: false, error: "Document not found" };
  // Old versions may predate sanitizing / schema changes — clean them like a normal save
  const values = cleanValues(docType, asObject(v.values), await loadElementTypes());
  const name = await uniqueName(v.name, doc.parentId, id);
  await db.document.update({
    where: { id },
    data: { name, urlSegment: await uniqueSegment(name, doc.parentId, id), values: values as object, edited: true, updatedById: user.id },
  });
  await db.contentVersion.create({ data: { documentId: id, name, values: values as object, userId: user.id } });
  await audit("Document", id, "Rollback", user.id, `Rolled back to version from ${v.createdAt.toISOString()}`);
  refresh();
  return { ok: true, id };
}
