import { db } from "@/lib/db";
import { canDelete, requireUser } from "@/lib/auth";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { RecycleBinList } from "@/components/backoffice/RecycleBinList";

export default async function ContentRecycleBin() {
  const user = await requireUser();
  const items = await db.document.findMany({
    where: { trashed: true, OR: [{ parentId: null }, { parent: { trashed: false } }] },
    include: { documentType: { select: { icon: true, name: true } }, _count: { select: { children: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <SimpleWorkspace title="Recycle Bin" icon="Skull">
      <RecycleBinList
        canDelete={canDelete(user.role)}
        kind="content"
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          icon: i.documentType.icon,
          type: i.documentType.name,
          deletedAt: i.updatedAt.toISOString(),
          children: i._count.children,
        }))}
      />
    </SimpleWorkspace>
  );
}
