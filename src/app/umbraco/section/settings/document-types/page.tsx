import Link from "next/link";
import { db } from "@/lib/db";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { Box, Tag } from "@/components/ui";
import { Icon } from "@/lib/icons";
import { formatDate } from "@/lib/utils";

export default async function DocumentTypesList() {
  const types = await db.documentType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { documents: true } }, groups: { include: { _count: { select: { properties: true } } } } },
  });
  return (
    <SimpleWorkspace
      title="Document Types"
      icon="LayoutTemplate"
      actions={
        <Link
          href="/umbraco/section/settings/document-types/new"
          className="rounded-[3px] bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800"
        >
          Create
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl">
        <Box>
          {types.length === 0 ? (
            <p className="text-sm text-muted">No Document Types yet.</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Alias</th>
                  <th className="pb-2">Properties</th>
                  <th className="pb-2">Used by</th>
                  <th className="pb-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="py-2.5">
                      <Link
                        href={`/umbraco/section/settings/document-types/${t.id}`}
                        className="flex items-center gap-2 font-bold hover:text-brand-700"
                      >
                        <Icon name={t.icon} className="size-4 text-brand-800" /> {t.name}
                        {t.allowedAtRoot && <Tag>root</Tag>}
                        {t.isElement && <Tag tone="warning">element</Tag>}
                      </Link>
                    </td>
                    <td className="font-mono text-xs text-muted">{t.alias}</td>
                    <td className="text-muted">{t.groups.reduce((n, g) => n + g._count.properties, 0)}</td>
                    <td className="text-muted">{t._count.documents}</td>
                    <td className="text-muted">{formatDate(t.updatedAt)}</td>
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
