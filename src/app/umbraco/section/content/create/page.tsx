import { notFound } from "next/navigation";
import { canPublish, requireUser } from "@/lib/auth";
import { getAncestors, getDocTypeSchema } from "@/lib/content-schema";
import { ContentEditor } from "@/components/backoffice/ContentEditor";

export default async function CreateContentPage({ searchParams }: { searchParams: Promise<{ type?: string; parent?: string }> }) {
  const { type, parent } = await searchParams;
  const user = await requireUser();
  if (!type) notFound();
  const schema = await getDocTypeSchema(type);
  if (!schema) notFound();
  const ancestors = await getAncestors(parent ?? null);
  return (
    <ContentEditor
      key={`${type}-${parent ?? "root"}`}
      mode="create"
      parentId={parent ?? null}
      schema={schema}
      canPublish={canPublish(user.role)}
      breadcrumbs={[
        { name: "Content", href: "/umbraco/section/content" },
        ...ancestors.map((a) => ({ name: a.name, href: `/umbraco/section/content/edit/${a.id}` })),
      ]}
    />
  );
}
