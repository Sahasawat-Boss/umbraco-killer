"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { EDITOR_MAP } from "@/lib/editors";
import { toAlias } from "@/lib/utils";
import type { SaveResult } from "./content";

export interface PropertyInput {
  id?: string;
  alias: string;
  name: string;
  description: string;
  dataTypeId: string;
  mandatory: boolean;
  validationRegex: string;
}
export interface GroupInput {
  id?: string;
  name: string;
  properties: PropertyInput[];
}
export interface DocumentTypeInput {
  id?: string;
  name: string;
  alias: string;
  icon: string;
  description: string;
  allowedAtRoot: boolean;
  isElement: boolean;
  allowedChildIds: string[];
  groups: GroupInput[];
}

const RESERVED = new Set(["id", "name", "key", "path", "level", "parent", "children", "url", "route", "contentType"]);

function refresh() {
  revalidatePath("/umbraco", "layout");
}

/**
 * Where an Element Type is used as a block: Block List Data Types that offer it,
 * and documents (incl. Recycle Bin) whose draft or published values contain such blocks.
 * Without this check, deleting it would silently drop those blocks on the next save.
 */
async function elementTypeUsage(id: string) {
  const blockLists = await db.dataType.findMany({ where: { editorAlias: "Killer.BlockList" }, select: { name: true, config: true } });
  const dataTypes = blockLists
    .filter((d) => {
      const blocks = (d.config as { blocks?: unknown } | null)?.blocks;
      return Array.isArray(blocks) && blocks.includes(id);
    })
    .map((d) => d.name);
  const needle = `"contentTypeId": "${id}"`; // jsonb::text format
  const docs = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM "Document"
    WHERE "values"::text LIKE '%' || ${needle} || '%' OR "publishedValues"::text LIKE '%' || ${needle} || '%'
    LIMIT 5`;
  return { dataTypes, documents: docs.map((d) => d.name) };
}

function usageMessage(name: string, u: { dataTypes: string[]; documents: string[] }) {
  const parts = [
    u.dataTypes.length && `Block List Data Type(s): ${u.dataTypes.join(", ")}`,
    u.documents.length && `content: ${u.documents.join(", ")}${u.documents.length === 5 ? "…" : ""}`,
  ].filter(Boolean);
  return `${name} is used as a block in ${parts.join(" and ")}. Remove it from there first.`;
}

export async function saveDocumentType(input: DocumentTypeInput): Promise<SaveResult> {
  const user = await requireAdmin();
  const name = input.name.trim();
  const alias = toAlias(input.alias || name);
  if (!name || !alias) return { ok: false, error: "Name and alias are required" };

  const clash = await db.documentType.findFirst({ where: { alias, ...(input.id ? { NOT: { id: input.id } } : {}) } });
  if (clash) return { ok: false, error: `Alias "${alias}" is already used by ${clash.name}` };

  const seen = new Set<string>();
  for (const g of input.groups) {
    if (!g.name.trim()) return { ok: false, error: "Every group needs a name" };
    for (const p of g.properties) {
      const pa = toAlias(p.alias || p.name);
      if (!pa || !p.name.trim()) return { ok: false, error: "Every property needs a name and alias" };
      if (RESERVED.has(pa)) return { ok: false, error: `"${pa}" is a reserved alias` };
      if (seen.has(pa)) return { ok: false, error: `Duplicate property alias "${pa}"` };
      if (!p.dataTypeId) return { ok: false, error: `Property "${p.name}" needs a data type` };
      seen.add(pa);
    }
  }

  // Turning an Element Type back into a normal Document Type would orphan its blocks, too
  if (input.id && !input.isElement) {
    const before = await db.documentType.findUnique({ where: { id: input.id }, select: { isElement: true } });
    if (before?.isElement) {
      const usage = await elementTypeUsage(input.id);
      if (usage.dataTypes.length || usage.documents.length) return { ok: false, error: usageMessage(name, usage) };
    }
  }

  const id = await db.$transaction(async (tx) => {
    const data = {
      name,
      alias,
      icon: input.icon || "FileText",
      description: input.description,
      allowedAtRoot: input.allowedAtRoot,
      isElement: input.isElement,
      allowedChildIds: input.allowedChildIds,
    };
    const dt = input.id
      ? await tx.documentType.update({ where: { id: input.id }, data })
      : await tx.documentType.create({ data });

    const keepGroupIds = input.groups.map((g) => g.id).filter(Boolean) as string[];
    await tx.propertyGroup.deleteMany({ where: { documentTypeId: dt.id, NOT: { id: { in: keepGroupIds } } } });

    for (const [gi, g] of input.groups.entries()) {
      const group = g.id
        ? await tx.propertyGroup.update({ where: { id: g.id }, data: { name: g.name.trim(), sortOrder: gi } })
        : await tx.propertyGroup.create({ data: { documentTypeId: dt.id, name: g.name.trim(), sortOrder: gi } });
      const keepPropIds = g.properties.map((p) => p.id).filter(Boolean) as string[];
      await tx.propertyType.deleteMany({ where: { groupId: group.id, NOT: { id: { in: keepPropIds } } } });
      for (const [pi, p] of g.properties.entries()) {
        const pdata = {
          groupId: group.id,
          alias: toAlias(p.alias || p.name),
          name: p.name.trim(),
          description: p.description,
          dataTypeId: p.dataTypeId,
          mandatory: p.mandatory,
          validationRegex: p.validationRegex,
          sortOrder: pi,
        };
        if (p.id) await tx.propertyType.update({ where: { id: p.id }, data: pdata });
        else await tx.propertyType.create({ data: pdata });
      }
    }
    return dt.id;
  });
  await audit("DocumentType", id, "Save", user.id);
  refresh();
  return { ok: true, id };
}

export async function deleteDocumentType(id: string): Promise<SaveResult> {
  const user = await requireAdmin();
  const used = await db.document.count({ where: { documentTypeId: id } });
  if (used) return { ok: false, error: `This Document Type is used by ${used} content item(s) and cannot be deleted` };
  const type = await db.documentType.findUnique({ where: { id } });
  if (!type) return { ok: false, error: "Not found" };
  if (type.isElement) {
    const usage = await elementTypeUsage(id);
    if (usage.dataTypes.length || usage.documents.length) return { ok: false, error: usageMessage(type.name, usage) };
  }
  await db.documentType.delete({ where: { id } });
  // remove from other types' allowed children
  const others = await db.documentType.findMany({ where: { allowedChildIds: { has: id } } });
  for (const o of others) {
    await db.documentType.update({
      where: { id: o.id },
      data: { allowedChildIds: o.allowedChildIds.filter((c) => c !== id) },
    });
  }
  await audit("DocumentType", id, "Delete", user.id);
  refresh();
  return { ok: true };
}

export async function saveDataType(input: {
  id?: string;
  name: string;
  editorAlias: string;
  config: Record<string, unknown>;
}): Promise<SaveResult> {
  const user = await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  if (!EDITOR_MAP.has(input.editorAlias)) return { ok: false, error: "Please select a property editor" };
  const clash = await db.dataType.findFirst({ where: { name, ...(input.id ? { NOT: { id: input.id } } : {}) } });
  if (clash) return { ok: false, error: `A data type named "${name}" already exists` };
  const data = { name, editorAlias: input.editorAlias, config: input.config as object };
  const dt = input.id
    ? await db.dataType.update({ where: { id: input.id }, data })
    : await db.dataType.create({ data });
  await audit("DataType", dt.id, "Save", user.id);
  refresh();
  return { ok: true, id: dt.id };
}

export async function deleteDataType(id: string): Promise<SaveResult> {
  const user = await requireAdmin();
  const used = await db.propertyType.count({ where: { dataTypeId: id } });
  if (used) return { ok: false, error: `This Data Type is used by ${used} propert${used === 1 ? "y" : "ies"} and cannot be deleted` };
  await db.dataType.delete({ where: { id } });
  await audit("DataType", id, "Delete", user.id);
  refresh();
  return { ok: true };
}
