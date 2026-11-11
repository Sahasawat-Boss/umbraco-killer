"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface TreeItem {
  id: string;
  parentId: string | null;
  name: string;
  icon: string;
  href: string;
  muted?: boolean;
  edited?: boolean;
  italic?: boolean;
}

export interface MenuAction {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

export function ActionMenu({ actions, anchor, onClose }: { actions: MenuAction[]; anchor: { x: number; y: number }; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    setTimeout(() => window.addEventListener("mousedown", h));
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("mousedown", h);
      window.removeEventListener("keydown", k);
    };
  }, [onClose]);
  const top = Math.min(anchor.y, typeof window !== "undefined" ? window.innerHeight - actions.length * 38 - 20 : anchor.y);
  return (
    <div
      ref={ref}
      className="animate-fade-in fixed z-50 min-w-[210px] rounded-[6px] border border-line bg-white py-1.5 shadow-xl"
      style={{ left: anchor.x, top }}
    >
      {actions.map((a) => (
        <div key={a.label}>
          {a.separatorBefore && <div className="my-1 border-t border-line" />}
          <button
            onClick={() => {
              onClose();
              a.onClick();
            }}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2 text-left text-[14px] hover:bg-selected",
              a.danger && "text-brand-700",
            )}
          >
            <Icon name={a.icon} className="size-4" />
            {a.label}
          </button>
        </div>
      ))}
    </div>
  );
}

export function Tree({
  items,
  activeId,
  rootLabel,
  rootHref,
  rootActions,
  itemActions,
  storageKey,
  footer,
}: {
  items: TreeItem[];
  activeId?: string;
  rootLabel: string;
  rootHref: string;
  rootActions?: MenuAction[];
  itemActions?: (item: TreeItem) => MenuAction[];
  storageKey: string;
  footer?: ReactNode;
}) {
  const children = useMemo(() => {
    const m = new Map<string | null, TreeItem[]>();
    for (const i of items) m.set(i.parentId, [...(m.get(i.parentId) ?? []), i]);
    return m;
  }, [items]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ actions: MenuAction[]; x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      setExpanded(new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]")));
    } catch {}
  }, [storageKey]);

  // auto-expand ancestors of active item
  useEffect(() => {
    if (!activeId) return;
    const byId = new Map(items.map((i) => [i.id, i]));
    const anc: string[] = [];
    let cur = byId.get(activeId)?.parentId;
    while (cur) {
      anc.push(cur);
      cur = byId.get(cur)?.parentId ?? null;
    }
    if (anc.length) setExpanded((s) => (anc.every((a) => s.has(a)) ? s : new Set([...s, ...anc])));
  }, [activeId, items]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...n]));
      return n;
    });

  const openMenu = (actions: MenuAction[] | undefined, e: React.MouseEvent) => {
    if (!actions?.length) return;
    e.preventDefault();
    e.stopPropagation();
    setMenu({ actions, x: e.clientX, y: e.clientY });
  };

  const renderLevel = (parentId: string | null, depth: number): ReactNode =>
    (children.get(parentId) ?? []).map((item) => {
      const kids = children.get(item.id);
      const open = expanded.has(item.id);
      const actions = itemActions?.(item);
      return (
        <div key={item.id}>
          <div
            className={cn(
              "group flex h-9 items-center pr-1 text-[14px] hover:bg-black/[0.04]",
              activeId === item.id && "bg-selected hover:bg-selected",
            )}
            style={{ paddingLeft: 8 + depth * 18 }}
            onContextMenu={(e) => openMenu(actions, e)}
          >
            <button
              onClick={() => kids && toggle(item.id)}
              className={cn("flex size-6 shrink-0 items-center justify-center rounded text-muted", !kids && "invisible")}
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
            </button>
            <Link
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 py-1",
                item.muted && "text-muted",
                item.italic && "italic",
                activeId === item.id && "font-bold",
              )}
            >
              <span className="relative">
                <Icon name={item.icon} className={cn("size-[17px]", item.muted ? "text-muted/70" : "text-brand-800")} />
                {item.edited && !item.muted && (
                  <span className="absolute -top-0.5 -right-1 size-2 rounded-full border border-white bg-amber-500" title="Unpublished changes" />
                )}
              </span>
              <span className="truncate">{item.name}</span>
            </Link>
            {actions && actions.length > 0 && (
              <button
                onClick={(e) => openMenu(actions, e)}
                className="invisible flex size-7 items-center justify-center rounded hover:bg-black/10 group-hover:visible"
                aria-label="Actions"
              >
                <MoreHorizontal className="size-4" />
              </button>
            )}
          </div>
          {open && kids && renderLevel(item.id, depth + 1)}
        </div>
      );
    });

  return (
    <div className="py-2">
      <div className="group flex h-10 items-center px-4" onContextMenu={(e) => openMenu(rootActions, e)}>
        <Link href={rootHref} className="flex-1 text-[15px] font-bold">
          {rootLabel}
        </Link>
        {rootActions && (
          <button
            onClick={(e) => openMenu(rootActions, e)}
            className="flex size-7 items-center justify-center rounded opacity-60 hover:bg-black/10 hover:opacity-100"
            aria-label="Actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </div>
      {renderLevel(null, 0)}
      {footer}
      {menu && <ActionMenu actions={menu.actions} anchor={{ x: menu.x, y: menu.y }} onClose={() => setMenu(null)} />}
    </div>
  );
}

export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-r border-line bg-white md:block">{children}</aside>
  );
}
