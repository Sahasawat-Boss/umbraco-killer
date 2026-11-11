import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { Box } from "@/components/ui";
import { Icon } from "@/lib/icons";
import { formatDate } from "@/lib/utils";

export default async function ContentDashboard() {
  const user = await requireUser();
  const [docCount, publishedCount, mediaCount, typeCount, recent, rootCount] = await Promise.all([
    db.document.count({ where: { trashed: false } }),
    db.document.count({ where: { trashed: false, published: true } }),
    db.media.count({ where: { trashed: false, NOT: { mediaType: "Folder" } } }),
    db.documentType.count(),
    db.document.findMany({
      where: { trashed: false },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { documentType: { select: { icon: true, name: true } } },
    }),
    db.document.count({ where: { trashed: false, parentId: null } }),
  ]);
  const stats = [
    { label: "Documents", value: docCount, icon: "FileText" },
    { label: "Published", value: publishedCount, icon: "Rocket" },
    { label: "Media items", value: mediaCount, icon: "Image" },
    { label: "Document Types", value: typeCount, icon: "LayoutTemplate" },
  ];
  return (
    <SimpleWorkspace title="Content" icon="Folder">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="relative overflow-hidden rounded-[6px] bg-header p-8 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,#ec383855,transparent_50%)]" />
          <div className="relative">
            <h2 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]} 🔥</h2>
            <p className="mt-2 max-w-2xl text-white/75">
              {rootCount === 0
                ? "Your content tree is empty. Create a Document Type in Settings, allow it at root, then click “…” next to Content to create your first page."
                : "Pick an item in the tree to start editing, or right-click a node to create, move, copy or sort content."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {user.role === "admin" && (
                <Link href="/umbraco/section/settings/document-types/new" className="rounded-[3px] bg-brand-600 px-4 py-2 text-sm font-bold hover:bg-brand-500">
                  New Document Type
                </Link>
              )}
              <Link href="/umbraco/section/media" className="rounded-[3px] bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
                Upload media
              </Link>
              <a href="/api/delivery/v2/content" target="_blank" className="rounded-[3px] bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
                Delivery API
              </a>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-4 rounded-[6px] bg-white p-5 shadow-[0_1px_1px_rgba(0,0,0,0.12)]">
              <div className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icon name={s.icon} className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-muted">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        <Box headline="Recently edited">
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet.</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="pb-2 font-bold">Name</th>
                  <th className="pb-2 font-bold">Type</th>
                  <th className="pb-2 font-bold">Status</th>
                  <th className="pb-2 font-bold">Last edited</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr key={d.id} className="border-t border-line">
                    <td className="py-2.5">
                      <Link href={`/umbraco/section/content/edit/${d.id}`} className="flex items-center gap-2 font-bold hover:text-brand-700">
                        <Icon name={d.documentType.icon} className="size-4 text-brand-800" />
                        {d.name}
                      </Link>
                    </td>
                    <td className="text-muted">{d.documentType.name}</td>
                    <td>
                      <span className={d.published ? (d.edited ? "text-amber-700" : "text-brand-700") : "text-muted"}>
                        {d.published ? (d.edited ? "Published (pending changes)" : "Published") : "Draft"}
                      </span>
                    </td>
                    <td className="text-muted">{formatDate(d.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Box>
      </div>
    </SimpleWorkspace>
  );
}
