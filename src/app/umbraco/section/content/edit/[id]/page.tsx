import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canPublish, requireUser } from "@/lib/auth";
import { getAncestors, getDocTypeSchema } from "@/lib/content-schema";
import { getPublishedRoutes } from "@/lib/routes";
import { ContentEditor } from "@/components/backoffice/ContentEditor";
import { cleanStoredValues } from "@/lib/content-values";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.trashed) notFound();
  const [schema, ancestors, routes, versions, history, users, values] = await Promise.all([
    getDocTypeSchema(doc.documentTypeId),
    getAncestors(doc.parentId),
    getPublishedRoutes(),
    db.contentVersion.findMany({ where: { documentId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.auditEntry.findMany({ where: { entityId: id }, orderBy: { createdAt: "desc" }, take: 30, include: { user: true } }),
    db.user.findMany({ select: { id: true, name: true } }),
    // cleaned + sanitized: stored HTML is injected into the Rich Text editor via innerHTML
    cleanStoredValues(doc.documentTypeId, doc.values),
  ]);
  if (!schema) notFound();
  const userName = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? "Unknown";

  return (
    <ContentEditor
      key={doc.id + doc.updatedAt.toISOString()}
      mode="edit"
      parentId={doc.parentId}
      schema={schema}
      canPublish={canPublish(user.role)}
      breadcrumbs={[
        { name: "Content", href: "/umbraco/section/content" },
        ...ancestors.map((a) => ({ name: a.name, href: `/umbraco/section/content/edit/${a.id}` })),
      ]}
      doc={{
        id: doc.id,
        name: doc.name,
        values,
        published: doc.published,
        edited: doc.edited,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        publishedAt: doc.publishedAt?.toISOString() ?? null,
        createdBy: userName(doc.createdById),
        updatedBy: userName(doc.updatedById),
        url: routes.routeById.get(doc.id) ?? null,
      }}
      versions={versions.map((v) => ({ id: v.id, name: v.name, createdAt: v.createdAt.toISOString(), published: v.published, user: userName(v.userId) }))}
      history={history.map((h) => ({ id: h.id, action: h.action, comment: h.comment, createdAt: h.createdAt.toISOString(), user: h.user?.name ?? "System" }))}
    />
  );
}
