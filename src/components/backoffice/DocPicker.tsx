"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Check } from "lucide-react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type PickNode = { id: string; parentId: string | null; name: string; icon: string; disabled?: boolean; muted?: boolean };

/** Selectable tree used by Move/Copy dialogs and the Content Picker */
export function PickTree({
  nodes,
  selected,
  onSelect,
  rootOption,
  multiple,
}: {
  nodes: PickNode[];
  selected: string[];
  onSelect: (id: string | null) => void;
  rootOption?: string;
  multiple?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const kids = useMemo(() => {
    const m = new Map<string | null, PickNode[]>();
    for (const n of nodes) m.set(n.parentId, [...(m.get(n.parentId) ?? []), n]);
    return m;
  }, [nodes]);

  const row = (n: { id: string | null; name: string; icon: string; disabled?: boolean; muted?: boolean }, depth: number, hasKids: boolean, extra?: ReactNode) => {
    const isSel = selected.includes(n.id ?? "$root");
    return (
      <div
        key={n.id ?? "$root"}
        className={cn("flex h-9 items-center rounded pr-2", isSel ? "bg-selected" : "hover:bg-black/[0.04]")}
        style={{ paddingLeft: 4 + depth * 18 }}
      >
        <button
          className={cn("flex size-6 items-center justify-center text-muted", !hasKids && "invisible")}
          onClick={() =>
            n.id &&
            setExpanded((s) => {
              const x = new Set(s);
              if (x.has(n.id!)) x.delete(n.id!);
              else x.add(n.id!);
              return x;
            })
          }
        >
          <ChevronRight className={cn("size-4 transition-transform", n.id && expanded.has(n.id) && "rotate-90")} />
        </button>
        <button
          disabled={n.disabled}
          onClick={() => onSelect(n.id)}
          className={cn(
            "flex flex-1 items-center gap-2 text-left text-[14px] disabled:cursor-not-allowed disabled:opacity-40",
            n.muted && "text-muted",
          )}
        >
          <Icon name={n.icon} className="size-4 text-brand-800" />
          <span className="truncate">{n.name}</span>
          {multiple && isSel && <Check className="ml-auto size-4 text-brand-700" />}
        </button>
        {extra}
      </div>
    );
  };

  const walk = (parentId: string | null, depth: number): ReactNode[] =>
    (kids.get(parentId) ?? []).flatMap((n) => {
      const hasKids = !!kids.get(n.id)?.length;
      return [row(n, depth, hasKids), ...(expanded.has(n.id) ? walk(n.id, depth + 1) : [])];
    });

  const filtered = filter.trim()
    ? nodes.filter((n) => n.name.toLowerCase().includes(filter.trim().toLowerCase())).map((n) => row(n, 0, false))
    : null;

  return (
    <div className="rounded-[6px] bg-white p-2">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Type to search..."
        className="mb-2 h-9 w-full rounded-[3px] border border-line px-2.5 text-sm outline-none focus:border-brand-500"
      />
      {filtered ?? (
        <>
          {rootOption && row({ id: null, name: rootOption, icon: "Globe" }, 0, false)}
          {walk(null, rootOption ? 1 : 0)}
        </>
      )}
      {nodes.length === 0 && !rootOption && <div className="p-4 text-center text-sm text-muted">Nothing here yet</div>}
    </div>
  );
}
