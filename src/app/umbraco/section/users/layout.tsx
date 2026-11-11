import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/backoffice/Tree";
import { UsersTree } from "@/components/backoffice/UserViews";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/umbraco/section/content");
  return (
    <>
      <Sidebar>
        <UsersTree />
      </Sidebar>
      {children}
    </>
  );
}
