import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { InstallForm } from "@/components/AuthForms";
import { isInstalled } from "@/lib/install";

export const dynamic = "force-dynamic";

export default async function InstallPage() {
  if (await isInstalled()) redirect("/umbraco/login");
  return (
    <AuthShell title="Install umb-killer" subtitle="Create the administrator account to get started.">
      <InstallForm />
    </AuthShell>
  );
}
