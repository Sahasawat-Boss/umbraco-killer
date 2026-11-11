"use server";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { imageSize } from "@/lib/image-size";
import type { SaveResult } from "./content";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const MAX_BYTES = 20 * 1024 * 1024;

function refresh() {
  revalidatePath("/umbraco", "layout");
}

function safeFileName(name: string) {
  const base = path.basename(name).replace(/[^\w.\-]+/g, "-").replace(/^-+/, "");
  return base || "file";
}

export async function uploadMedia(form: FormData): Promise<SaveResult & { count?: number }> {
  const user = await requireUser();
  const parentId = (form.get("parentId") as string) || null;
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "No files selected" };
  let count = 0;
  let lastId: string | undefined;
  for (const file of files) {
    if (file.size > MAX_BYTES) return { ok: false, error: `${file.name} is larger than 20 MB` };
    const id = randomUUID();
    const fileName = safeFileName(file.name);
    const dir = path.join(UPLOAD_ROOT, id);
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, fileName), buf);
    const isImage = file.type.startsWith("image/");
    const dims = isImage ? imageSize(buf) : null;
    await db.media.create({
      data: {
        id,
        name: file.name.replace(/\.[^.]+$/, ""),
        mediaType: isImage ? "Image" : "File",
        parentId,
        fileName,
        filePath: `${id}/${fileName}`,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        width: dims?.width,
        height: dims?.height,
      },
    });
    await audit("Media", id, "Create", user.id, "Uploaded");
    lastId = id;
    count++;
  }
  refresh();
  return { ok: true, count, id: lastId };
}

export async function createMediaFolder(name: string, parentId: string | null): Promise<SaveResult> {
  const user = await requireUser();
  if (!name.trim()) return { ok: false, error: "Name is required" };
  const f = await db.media.create({ data: { name: name.trim(), mediaType: "Folder", parentId } });
  await audit("Media", f.id, "Create", user.id, "Folder");
  refresh();
  return { ok: true, id: f.id };
}

export async function updateMedia(id: string, data: { name: string; altText: string }): Promise<SaveResult> {
  const user = await requireUser();
  if (!data.name.trim()) return { ok: false, error: "Name is required" };
  await db.media.update({ where: { id }, data: { name: data.name.trim(), altText: data.altText } });
  await audit("Media", id, "Save", user.id);
  refresh();
  return { ok: true, id };
}

async function mediaDescendants(rootId: string) {
  const all = await db.media.findMany({ select: { id: true, parentId: true } });
  const ids: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    ids.push(cur);
    for (const m of all) if (m.parentId === cur) stack.push(m.id);
  }
  return ids;
}

export async function trashMedia(id: string): Promise<SaveResult> {
  const user = await requireUser();
  await db.media.updateMany({ where: { id: { in: await mediaDescendants(id) } }, data: { trashed: true } });
  await audit("Media", id, "Trash", user.id);
  refresh();
  return { ok: true };
}

export async function restoreMedia(id: string): Promise<SaveResult> {
  const user = await requireUser();
  const m = await db.media.findUnique({ where: { id }, include: { parent: true } });
  if (!m) return { ok: false, error: "Not found" };
  await db.media.updateMany({ where: { id: { in: await mediaDescendants(id) } }, data: { trashed: false } });
  if (m.parent?.trashed) await db.media.update({ where: { id }, data: { parentId: null } });
  await audit("Media", id, "Restore", user.id);
  refresh();
  return { ok: true };
}

export async function deleteMedia(id: string): Promise<SaveResult> {
  const user = await requireUser();
  const ids = await mediaDescendants(id);
  const items = await db.media.findMany({ where: { id: { in: ids } } });
  for (const m of items) {
    if (m.filePath) await rm(path.join(UPLOAD_ROOT, m.id), { recursive: true, force: true });
  }
  await db.media.delete({ where: { id } });
  await audit("Media", id, "Delete", user.id);
  refresh();
  return { ok: true };
}

export async function emptyMediaRecycleBin(): Promise<SaveResult> {
  await requireUser();
  const roots = await db.media.findMany({
    where: { trashed: true, OR: [{ parentId: null }, { parent: { trashed: false } }] },
    select: { id: true },
  });
  for (const r of roots) await deleteMedia(r.id);
  refresh();
  return { ok: true };
}

export async function moveMedia(id: string, newParentId: string | null): Promise<SaveResult> {
  const user = await requireUser();
  if (newParentId && (await mediaDescendants(id)).includes(newParentId)) {
    return { ok: false, error: "Cannot move a folder into itself" };
  }
  if (newParentId) {
    const p = await db.media.findUnique({ where: { id: newParentId } });
    if (p?.mediaType !== "Folder") return { ok: false, error: "Items can only be moved into folders" };
  }
  await db.media.update({ where: { id }, data: { parentId: newParentId } });
  await audit("Media", id, "Move", user.id);
  refresh();
  return { ok: true, id };
}
