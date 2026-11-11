import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Umbraco-style workspace: header (icon + name + view tabs), scrolling body, footer with actions */
export function Workspace({
  icon,
  backHref,
  name,
  tabs,
  activeTab,
  onTab,
  children,
  breadcrumbs,
  actions,
}: {
  icon?: string;
  backHref?: string;
  name: ReactNode;
  tabs?: { key: string; label: string; icon?: string; invalid?: boolean }[];
  activeTab?: string;
  onTab?: (key: string) => void;
  children: ReactNode;
  breadcrumbs?: { name: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-[70px] shrink-0 items-center gap-3 border-b border-line bg-white px-5">
        {backHref && (
          <Link href={backHref} className="rounded p-1.5 text-muted hover:bg-black/5 hover:text-ink" aria-label="Back">
            <ArrowLeft className="size-5" />
          </Link>
        )}
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[4px] bg-brand-50 text-brand-700">
            <Icon name={icon} className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">{name}</div>
        {tabs && tabs.length > 1 && (
          <nav className="flex h-full items-stretch">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => onTab?.(t.key)}
                className={cn(
                  "relative flex min-w-[80px] flex-col items-center justify-center gap-0.5 px-3 text-[13px] transition-colors hover:text-brand-700",
                  activeTab === t.key ? "font-bold text-brand-700" : "text-muted",
                )}
              >
                {t.icon && <Icon name={t.icon} className="size-[18px]" />}
                <span className="flex items-center gap-1">
                  {t.label}
                  {t.invalid && <span className="size-2 rounded-full bg-brand-600" />}
                </span>
                {activeTab === t.key && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-brand-600" />}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">{children}</div>
      {(breadcrumbs || actions) && (
        <div className="flex h-[56px] shrink-0 items-center gap-3 border-t border-line bg-white px-5">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-[13px] text-muted">
            {breadcrumbs?.map((b, i) => (
              <span key={i} className="flex items-center gap-1 truncate">
                {i > 0 && <ChevronRight className="size-3.5 shrink-0" />}
                {b.href ? (
                  <Link href={b.href} className="truncate hover:text-brand-700 hover:underline">
                    {b.name}
                  </Link>
                ) : (
                  <span className="truncate font-bold text-ink">{b.name}</span>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      )}
    </div>
  );
}

export function NameInput({
  value,
  onChange,
  placeholder = "Enter a name...",
  invalid,
  aliasSlot,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  aliasSlot?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full max-w-xl rounded-[3px] border border-transparent bg-transparent px-2 text-xl font-bold outline-none hover:border-line focus:border-brand-500 focus:bg-white",
          invalid && "border-brand-600 bg-brand-50",
        )}
      />
      {aliasSlot}
    </div>
  );
}

/** Static workspace for server-rendered pages (dashboards, lists) */
export function SimpleWorkspace({ title, icon, children, actions }: { title: string; icon?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-[70px] shrink-0 items-center gap-3 border-b border-line bg-white px-5">
        {icon && (
          <div className="flex size-9 items-center justify-center rounded-[4px] bg-brand-50 text-brand-700">
            <Icon name={icon} className="size-5" />
          </div>
        )}
        <h1 className="flex-1 text-xl font-bold">{title}</h1>
        {actions}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">{children}</div>
    </div>
  );
}
