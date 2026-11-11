import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DataTypeEditor } from "@/components/backoffice/DataTypeEditor";
import { asObject } from "@/lib/utils";

export default async function DataTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return <DataTypeEditor key="new" usedBy={[]} />;
  const dt = await db.dataType.findUnique({
    where: { id },
    include: { properties: { include: { group: { include: { documentType: true } } } } },
  });
  if (!dt) notFound();
  return (
    <DataTypeEditor
      key={dt.id + dt.updatedAt.toISOString()}
      dataType={{ id: dt.id, name: dt.name, editorAlias: dt.editorAlias, config: asObject(dt.config) }}
      usedBy={dt.properties.map((p) => ({ docType: p.group.documentType.name, docTypeId: p.group.documentType.id, property: p.name }))}
    />
  );
}
