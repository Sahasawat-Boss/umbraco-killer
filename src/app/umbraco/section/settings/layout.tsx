import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/backoffice/Tree";
import { SettingsTree } from "@/components/backoffice/SettingsTree";
import { getEditor } from "@/lib/editors";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/umbraco/section/content");
  const [docTypes, dataTypes] = await Promise.all([
    db.documentType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, icon: true } }),
    db.dataType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, editorAlias: true } }),
  ]);
  return (
    <>
      <Sidebar>
        <SettingsTree
          docTypes={docTypes}
          dataTypes={dataTypes.map((d) => ({ id: d.id, name: d.name, icon: getEditor(d.editorAlias).icon }))}
        />
      </Sidebar>
      {children}
    </>
  );
}
