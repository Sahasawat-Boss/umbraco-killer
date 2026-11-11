import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { UserEditor } from "@/components/backoffice/UserViews";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  if (id === "new") return <UserEditor key="new" isSelf={false} />;
  const u = await db.user.findUnique({ where: { id } });
  if (!u) notFound();
  return (
    <UserEditor
      key={u.id + u.updatedAt.toISOString()}
      isSelf={u.id === me.id}
      user={{
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        disabled: u.disabled,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      }}
    />
  );
}
