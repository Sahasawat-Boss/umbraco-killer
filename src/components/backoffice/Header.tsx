"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, CircleHelp, LogOut, KeyRound, ExternalLink } from "lucide-react";
import { LogoMark } from "../Logo";
import { cn, initials } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import { searchAll, type SearchHit } from "@/actions/search";
import { logoutAction } from "@/actions/auth";
import { changeOwnPassword } from "@/actions/users";
import { Button, Input, SidePanel } from "../ui";
import { useToast } from "../toast";

export function Header({
  sections,
  user,
}: {
  sections: { alias: string; label: string }[];
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const active = pathname.split("/")[3];
  const [searchOpen, setSearchOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      <header className="flex h-[60px] shrink-0 items-center bg-header px-4 text-white">
        <Link href="/umbraco/section/content" className="mr-6 flex items-center gap-2" title="umb-killer">
          <LogoMark />
          <span className="hidden text-[16px] font-bold sm:inline">
            umb<span className="text-brand-400">-killer</span>
          </span>
        </Link>
        <nav className="flex h-full items-stretch">
          {sections.map((s) => (
            <Link
              key={s.alias}
              href={`/umbraco/section/${s.alias}`}
              className={cn(
                "relative flex items-center px-4 text-[15px] transition-colors hover:bg-header-hover",
                active === s.alias ? "font-bold text-white" : "text-white/75",
              )}
            >
              {s.label}
              {active === s.alias && <span className="absolute inset-x-3 bottom-0 h-1 rounded-t bg-brand-500" />}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="rounded p-2 text-white/80 hover:bg-header-hover hover:text-white"
            title="Search (Ctrl+K)"
          >
            <Search className="size-5" />
          </button>
          <a
            href="/api/delivery/v2/content"
            target="_blank"
            className="rounded p-2 text-white/80 hover:bg-header-hover hover:text-white"
            title="Delivery API"
          >
            <CircleHelp className="size-5" />
          </a>
          <button
            onClick={() => setUserOpen(true)}
            className="ml-2 flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold ring-2 ring-white/20 hover:ring-white/50"
            title={user.name}
          >
            {initials(user.name)}
          </button>
        </div>
      </header>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      <UserPanel open={userOpen} onClose={() => setUserOpen(false)} user={user} />
    </>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [sel, setSel] = useState(0);
  const [, start] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const t = setTimeout(() => start(async () => { setHits(await searchAll(q)); setSel(0); }), 180);
    return () => clearTimeout(t);
  }, [q]);

  const go = (h?: SearchHit) => {
    if (!h) return;
    router.push(h.href);
    onClose();
  };
  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    <div className="fixed inset-0 z-50 flex justify-center pt-[12vh]">
      <div className="animate-fade-in absolute inset-0 bg-[#1f0a0c]/40" onClick={onClose} />
      <div className="animate-toast-in relative h-fit w-full max-w-xl overflow-hidden rounded-[8px] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-5 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter") go(hits[sel]);
            }}
            placeholder="Search content, media and settings..."
            className="h-14 flex-1 text-[16px] outline-none"
          />
          <kbd className="rounded border border-line px-1.5 text-xs text-muted">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {q && !hits.length && <div className="px-4 py-6 text-center text-muted">No results for “{q}”</div>}
          {groups.map((g) => (
            <div key={g}>
              <div className="px-4 pt-2 pb-1 text-xs font-bold tracking-wide text-muted uppercase">{g}</div>
              {hits.filter((h) => h.group === g).map((h) => {
                const idx = hits.indexOf(h);
                return (
                  <button
                    key={h.group + h.id}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => go(h)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left", sel === idx && "bg-selected")}
                  >
                    <Icon name={h.icon} className="size-4 text-brand-700" />
                    <span className="flex-1 truncate">{h.name}</span>
                    {h.detail && <span className="text-xs text-muted">{h.detail}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserPanel({ open, onClose, user }: { open: boolean; onClose: () => void; user: { name: string; email: string; role: string } }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <SidePanel open={open} onClose={onClose} title={user.name} width={420}>
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-[6px] bg-white p-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
            {initials(user.name)}
          </div>
          <div>
            <div className="font-bold">{user.name}</div>
            <div className="text-sm text-muted">{user.email}</div>
            <div className="mt-1 text-xs font-bold text-brand-700 capitalize">{user.role}</div>
          </div>
        </div>
        <div className="space-y-2 rounded-[6px] bg-white p-4">
          <div className="mb-1 flex items-center gap-2 font-bold"><KeyRound className="size-4" /> Change password</div>
          <Input type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <Input type="password" placeholder="New password (10+ chars)" value={next} onChange={(e) => setNext(e.target.value)} />
          <Button
            look="outline"
            busy={busy}
            onClick={async () => {
              setBusy(true);
              const r = await changeOwnPassword(cur, next);
              setBusy(false);
              if (r.ok) { setCur(""); setNext(""); toast({ tone: "positive", headline: "Password changed" }); }
              else toast({ tone: "danger", headline: "Could not change password", message: r.error });
            }}
          >
            Change password
          </Button>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" className="flex-1">
            <Button look="outline" className="w-full"><ExternalLink className="size-4" /> View site</Button>
          </a>
          <form action={logoutAction} className="flex-1">
            <Button look="danger" className="w-full"><LogOut className="size-4" /> Log out</Button>
          </form>
        </div>
      </div>
    </SidePanel>
  );
}
