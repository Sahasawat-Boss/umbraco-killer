import { db } from "./db";
import { asObject } from "./utils";

export type PropertySchema = {
  id: string;
  alias: string;
  name: string;
  description: string;
  mandatory: boolean;
  editorAlias: string;
  config: Record<string, unknown>;
};
export type GroupSchema = { id: string; name: string; properties: PropertySchema[] };
export type DocTypeSchema = { id: string; name: string; alias: string; icon: string; groups: GroupSchema[] };

const schemaInclude = {
  groups: {
    orderBy: { sortOrder: "asc" as const },
    include: { properties: { orderBy: { sortOrder: "asc" as const }, include: { dataType: true } } },
  },
};

export async function getDocTypeSchema(id: string): Promise<DocTypeSchema | null> {
  const dt = await db.documentType.findUnique({ where: { id }, include: schemaInclude });
  return dt ? toSchema(dt) : null;
}

/** All Element Types (the building blocks of a Block List) */
export async function getElementTypeSchemas(): Promise<DocTypeSchema[]> {
  const types = await db.documentType.findMany({ where: { isElement: true }, orderBy: { name: "asc" }, include: schemaInclude });
  return types.map(toSchema);
}

type DocTypeWithSchema = NonNullable<Awaited<ReturnType<typeof db.documentType.findUnique<{ where: { id: string }; include: typeof schemaInclude }>>>>;

function toSchema(dt: DocTypeWithSchema): DocTypeSchema {
  return {
    id: dt.id,
    name: dt.name,
    alias: dt.alias,
    icon: dt.icon,
    groups: dt.groups.map((g) => ({
      id: g.id,
      name: g.name,
      properties: g.properties.map((p) => ({
        id: p.id,
        alias: p.alias,
        name: p.name,
        description: p.description,
        mandatory: p.mandatory,
        editorAlias: p.dataType.editorAlias,
        config: asObject(p.dataType.config),
      })),
    })),
  };
}

export async function getAncestors(parentId: string | null) {
  const chain: { id: string; name: string }[] = [];
  let cur = parentId;
  while (cur) {
    const d: { id: string; name: string; parentId: string | null } | null = await db.document.findUnique({
      where: { id: cur },
      select: { id: true, name: true, parentId: true },
    });
    if (!d) break;
    chain.unshift({ id: d.id, name: d.name });
    cur = d.parentId;
  }
  return chain;
}
