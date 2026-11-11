import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DocumentTypeEditor } from "@/components/backoffice/DocumentTypeEditor";

export default async function DocumentTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dataTypes, allDocTypes] = await Promise.all([
    db.dataType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, editorAlias: true } }),
    db.documentType.findMany({ where: { isElement: false }, orderBy: { name: "asc" }, select: { id: true, name: true, icon: true } }),
  ]);
  if (id === "new") return <DocumentTypeEditor key="new" dataTypes={dataTypes} allDocTypes={allDocTypes} usage={0} />;

  const dt = await db.documentType.findUnique({
    where: { id },
    include: { groups: { orderBy: { sortOrder: "asc" }, include: { properties: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!dt) notFound();
  const usage = await db.document.count({ where: { documentTypeId: id } });
  return (
    <DocumentTypeEditor
      key={dt.id + dt.updatedAt.toISOString()}
      dataTypes={dataTypes}
      allDocTypes={allDocTypes}
      usage={usage}
      docType={{
        id: dt.id,
        name: dt.name,
        alias: dt.alias,
        icon: dt.icon,
        description: dt.description,
        allowedAtRoot: dt.allowedAtRoot,
        isElement: dt.isElement,
        allowedChildIds: dt.allowedChildIds,
        groups: dt.groups.map((g) => ({
          id: g.id,
          name: g.name,
          properties: g.properties.map((p) => ({
            id: p.id,
            alias: p.alias,
            name: p.name,
            description: p.description,
            dataTypeId: p.dataTypeId,
            mandatory: p.mandatory,
            validationRegex: p.validationRegex,
          })),
        })),
      }}
    />
  );
}
