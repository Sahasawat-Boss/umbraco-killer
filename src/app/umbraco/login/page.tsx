import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/AuthForms";
import { isInstalled } from "@/lib/install";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await isInstalled())) redirect("/install");
  if (await getCurrentUser()) redirect("/umbraco/section/content");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <AuthShell title={greeting} subtitle="Log in below">
      <LoginForm />
    </AuthShell>
  );
}
