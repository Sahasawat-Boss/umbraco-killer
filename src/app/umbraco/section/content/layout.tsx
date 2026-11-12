import { db } from "@/lib/db";
import { canDelete, canPublish, requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/backoffice/Tree";
import { ContentTree } from "@/components/backoffice/ContentTree";

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [docs, types, trashedCount] = await Promise.all([
    db.document.findMany({
      where: { trashed: false },
      orderBy: { sortOrder: "asc" },
      select: { id: true, parentId: true, name: true, documentTypeId: true, published: true, edited: true, sortOrder: true },
    }),
    db.documentType.findMany({ where: { isElement: false }, orderBy: { name: "asc" } }),
    db.document.count({ where: { trashed: true } }),
  ]);
  return (
    <>
      <Sidebar>
        <ContentTree
          docs={docs}
          canPublish={canPublish(user.role)}
          canDelete={canDelete(user.role)}
          trashedCount={trashedCount}
          docTypes={types.map((t) => ({
            id: t.id,
            name: t.name,
            alias: t.alias,
            icon: t.icon,
            description: t.description,
            allowedAtRoot: t.allowedAtRoot,
            allowedChildIds: t.allowedChildIds,
          }))}
        />
      </Sidebar>
      {children}
    </>
  );
}
