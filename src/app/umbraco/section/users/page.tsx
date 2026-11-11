import Link from "next/link";
import { db } from "@/lib/db";
import { SimpleWorkspace } from "@/components/backoffice/Workspace";
import { UserCard } from "@/components/backoffice/UserViews";

export default async function UsersPage() {
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  return (
    <SimpleWorkspace
      title="Users"
      icon="Users"
      actions={
        <Link href="/umbraco/section/users/new" className="rounded-[3px] bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800">
          Create user
        </Link>
      }
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {users.map((u) => (
          <UserCard
            key={u.id}
            u={{ id: u.id, name: u.name, email: u.email, role: u.role, disabled: u.disabled, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }}
          />
        ))}
      </div>
    </SimpleWorkspace>
  );
}
