import Link from "next/link";
import { db } from "@/lib/db";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { getEditor } from "@/lib/editors";
import { Icon } from "@/lib/icons";

export default async function DataTypesList() {
  const types = await db.dataType.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { properties: true } } } });
  return (
    <SimpleWorkspace
      title="Data Types"
      icon="Database"
      actions={
        <Link
          href="/umbraco/section/settings/data-types/new"
          className="rounded-[3px] bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800"
        >
          Create
        </Link>
      }
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {types.map((t) => {
          const e = getEditor(t.editorAlias);
          return (
            <Link
              key={t.id}
              href={`/umbraco/section/settings/data-types/${t.id}`}
              className="flex items-center gap-3 rounded-[6px] bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.12)] hover:ring-2 hover:ring-brand-300"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded bg-brand-50 text-brand-700">
                <Icon name={e.icon} className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold">{t.name}</div>
                <div className="truncate text-xs text-muted">
                  {e.name} · used {t._count.properties}×
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </SimpleWorkspace>
  );
}
