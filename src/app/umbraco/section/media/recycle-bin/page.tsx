import { db } from "@/lib/db";
import { canDelete, requireUser } from "@/lib/auth";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { RecycleBinList } from "@/components/backoffice/RecycleBinList";

export default async function MediaRecycleBin() {
  const user = await requireUser();
  const items = await db.media.findMany({
    where: { trashed: true, OR: [{ parentId: null }, { parent: { trashed: false } }] },
    include: { _count: { select: { children: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <SimpleWorkspace title="Recycle Bin" icon="Skull">
      <RecycleBinList
        canDelete={canDelete(user.role)}
        kind="media"
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          icon: i.mediaType === "Folder" ? "Folder" : i.mediaType === "Image" ? "Image" : "File",
          type: i.mediaType,
          deletedAt: i.updatedAt.toISOString(),
          children: i._count.children,
        }))}
      />
    </SimpleWorkspace>
  );
}
