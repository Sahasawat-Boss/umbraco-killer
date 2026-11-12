import { Logo } from "./Logo";
import { VersionBadge } from "./VersionBadge";

/** Split-screen layout used by login & installer, like the Umbraco login page */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,40%)]">
      <div className="relative hidden overflow-hidden bg-header lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#b3151555,transparent_55%),radial-gradient(circle_at_80%_80%,#ec383833,transparent_50%)]" />
        <svg className="absolute -right-24 -bottom-24 size-[620px] opacity-[0.07]" viewBox="0 0 32 32">
          <path d="M16 1.5 29 6v9.5c0 7.6-5.4 13.2-13 15-7.6-1.8-13-7.4-13-15V6z" fill="#fff" />
        </svg>
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Logo />
            <VersionBadge className="border-white/30 text-white/80 hover:border-white/60 hover:text-white" />
          </div>
          <div className="max-w-md text-white">
            <h2 className="text-4xl font-bold leading-tight">Content management, sharpened.</h2>
            <p className="mt-4 text-white/70">
              Structured content, a friendly backoffice and a headless Delivery API — in red.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo light={false} />
          </div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 mb-8 text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
