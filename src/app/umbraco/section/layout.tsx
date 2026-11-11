import { requireUser, canAccessSection } from "@/lib/auth";
import { Header } from "@/components/backoffice/Header";
import { ToastProvider } from "@/components/toast";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { alias: "content", label: "Content" },
  { alias: "media", label: "Media" },
  { alias: "settings", label: "Settings" },
  { alias: "users", label: "Users" },
];

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <ToastProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <Header
          sections={SECTIONS.filter((s) => canAccessSection(user.role, s.alias))}
          user={{ name: user.name, email: user.email, role: user.role }}
        />
        <div className="flex min-h-0 flex-1">{children}</div>
      </div>
    </ToastProvider>
  );
}
