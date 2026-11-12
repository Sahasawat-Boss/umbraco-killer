"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { listElementTypes } from "@/actions/pickers";
import type { DocTypeSchema } from "@/lib/content-schema";
import { asBlocks, isEmptyValue, newBlockKey, type BlockItem } from "@/lib/editors";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Box, Button, PropertyRow, SidePanel, Tag } from "../ui";
import { PropertyEditor } from "./PropertyEditor";

let elementCache: { at: number; types: Promise<DocTypeSchema[]> } | null = null;

/** Loads all Element Types; the request is shared by every Block List mounted at about the same time. */
export function useElementTypes() {
  const [types, setTypes] = useState<DocTypeSchema[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!elementCache || Date.now() - elementCache.at > 5000) elementCache = { at: Date.now(), types: listElementTypes() };
    elementCache.types.then((t) => alive && setTypes(t));
    return () => {
      alive = false;
    };
  }, []);
  return types;
}

/** Plain-text preview of a block: the first text-ish value it has. */
function blockLabel(block: BlockItem, schema: DocTypeSchema | undefined) {
  for (const g of schema?.groups ?? [])
    for (const p of g.properties) {
      const v = block.values[p.alias];
      if (typeof v === "string") {
        const text = v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (text && !/^#[0-9a-f]{3,8}$/i.test(text) && !/^[0-9a-f-]{36}$/i.test(text)) return text;
      }
    }
  return "";
}

function blockErrors(block: BlockItem, schema: DocTypeSchema | undefined): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const g of schema?.groups ?? [])
    for (const p of g.properties) if (p.mandatory && isEmptyValue(block.values[p.alias])) errors[p.alias] = "Value cannot be empty";
  return errors;
}

type Editing = { index: number; block: BlockItem; isNew: boolean };

export function BlockListEditor({
  config,
  value,
  onChange,
  invalid,
}: {
  config: Record<string, unknown>;
  value: unknown;
  onChange: (v: unknown) => void;
  invalid?: boolean;
}) {
  const blocks = asBlocks(value);
  const types = useElementTypes();
  const typeById = useMemo(() => new Map((types ?? []).map((t) => [t.id, t])), [types]);
  const allowedIds = Array.isArray(config.blocks) ? (config.blocks as string[]) : [];
  const allowed = (types ?? []).filter((t) => !allowedIds.length || allowedIds.includes(t.id));
  const max = Number(config.max) || 0;
  const min = Number(config.min) || 0;
  const canAdd = !max || blocks.length < max;

  const [catalogAt, setCatalogAt] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const update = (next: BlockItem[]) => onChange(next);
  const move = (from: number, to: number) => {
    if (to < 0 || to > blocks.length || from === to || from + 1 === to) return;
    const next = [...blocks];
    const [b] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, b!);
    update(next);
  };

  const openCatalog = (index: number) => {
    if (!canAdd) return;
    // Like Umbraco: with only one allowed block type, skip the catalog.
    if (allowed.length === 1) return startNew(allowed[0]!, index);
    setCatalogAt(index);
  };
  const startNew = (type: DocTypeSchema, index: number) => {
    setCatalogAt(null);
    setEditing({ index, isNew: true, block: { key: newBlockKey(), contentTypeId: type.id, values: {} } });
  };
  const submit = () => {
    if (!editing) return;
    const next = [...blocks];
    if (editing.isNew) next.splice(editing.index, 0, editing.block);
    else next[editing.index] = editing.block;
    update(next);
    setEditing(null);
  };

  const editingSchema = editing ? typeById.get(editing.block.contentTypeId) : undefined;
  const editingErrors = editing ? blockErrors(editing.block, editingSchema) : {};

  const addZone = (index: number) =>
    canAdd ? (
      <div className="group/add relative h-3">
        <button
          type="button"
          onClick={() => openCatalog(index)}
          title="Add block here"
          className="absolute inset-x-0 top-1/2 z-[1] flex -translate-y-1/2 items-center justify-center opacity-0 transition group-hover/add:opacity-100 focus:opacity-100"
        >
          <span className="h-0.5 flex-1 bg-brand-400" />
          <span className="mx-1 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white shadow">
            <Plus className="size-3.5" />
          </span>
          <span className="h-0.5 flex-1 bg-brand-400" />
        </button>
      </div>
    ) : (
      <div className="h-3" />
    );

  return (
    <div className={cn("rounded-[4px]", invalid && "ring-1 ring-brand-600 ring-offset-4")}>
      {blocks.length > 0 && addZone(0)}
      {blocks.map((b, i) => {
        const schema = typeById.get(b.contentTypeId);
        const label = blockLabel(b, schema);
        const hasErrors = schema && Object.keys(blockErrors(b, schema)).length > 0;
        const missing = types !== null && !schema;
        return (
          <div key={b.key}>
            <div
              draggable
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", b.key);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropAt(null);
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null && dropAt !== null) move(dragFrom, dropAt);
                setDragFrom(null);
                setDropAt(null);
              }}
              className={cn(
                "group relative flex items-center gap-3 rounded-[4px] border bg-white px-2 py-2.5 transition",
                hasErrors || missing ? "border-brand-500" : "border-line hover:border-brand-300",
                dragFrom === i && "opacity-40",
                b.hidden && "bg-[repeating-linear-gradient(135deg,#fff_0_8px,#faf5f5_8px_16px)]",
              )}
            >
              {dropAt === i && dragFrom !== null && <span className="absolute inset-x-0 -top-2 h-0.5 rounded bg-brand-600" />}
              {dropAt === i + 1 && dragFrom !== null && <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded bg-brand-600" />}
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted active:cursor-grabbing" />
              <button
                type="button"
                disabled={missing}
                onClick={() => schema && setEditing({ index: i, isNew: false, block: structuredClone(b) })}
                className={cn("flex min-w-0 flex-1 items-center gap-3 text-left", b.hidden && "opacity-60")}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[4px] bg-brand-50 text-brand-700">
                  <Icon name={schema?.icon ?? "Skull"} className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{schema?.name ?? (missing ? "Unknown block type" : "Loading…")}</span>
                  {label && <span className="block truncate text-xs text-muted">{label}</span>}
                </span>
              </button>
              {b.hidden && <Tag>Hidden</Tag>}
              {hasErrors && <TriangleAlert className="size-4 shrink-0 text-brand-600" aria-label="Has validation errors" />}
              <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
                <IconBtn title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp /></IconBtn>
                <IconBtn title="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, i + 2)}><ArrowDown /></IconBtn>
                {schema && (
                  <IconBtn title="Edit" onClick={() => setEditing({ index: i, isNew: false, block: structuredClone(b) })}><Pencil /></IconBtn>
                )}
                {schema && canAdd && (
                  <IconBtn
                    title="Duplicate"
                    onClick={() => {
                      const next = [...blocks];
                      next.splice(i + 1, 0, { ...structuredClone(b), key: newBlockKey() });
                      update(next);
                    }}
                  >
                    <Copy />
                  </IconBtn>
                )}
                <IconBtn
                  title={b.hidden ? "Show on website" : "Hide from website"}
                  onClick={() => update(blocks.map((x, j) => (j === i ? { ...x, hidden: !x.hidden || undefined } : x)))}
                >
                  {b.hidden ? <EyeOff /> : <Eye />}
                </IconBtn>
                <IconBtn
                  title="Delete"
                  danger
                  onClick={() => {
                    if (confirm(`Delete this ${schema?.name ?? "block"}?`)) update(blocks.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 />
                </IconBtn>
              </div>
            </div>
            {addZone(i + 1)}
          </div>
        );
      })}

      {canAdd && (
        <button
          type="button"
          onClick={() => openCatalog(blocks.length)}
          disabled={types !== null && allowed.length === 0}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[4px] border-2 border-dashed border-line text-sm font-bold text-muted hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="size-4" /> {types !== null && allowed.length === 0 ? "No Element Types available" : "Add content"}
        </button>
      )}
      {(min > 0 || max > 0) && (
        <div className={cn("mt-1.5 text-xs", blocks.length < min || (max > 0 && blocks.length > max) ? "font-bold text-brand-700" : "text-muted")}>
          {blocks.length} block(s){min > 0 && ` · minimum ${min}`}{max > 0 && ` · maximum ${max}`}
        </div>
      )}

      {/* Block catalogue */}
      <SidePanel open={catalogAt !== null} onClose={() => setCatalogAt(null)} title="Add content" width={640}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {allowed.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => startNew(t, catalogAt ?? blocks.length)}
              className="flex flex-col items-center gap-2 rounded-[6px] bg-white p-5 text-center shadow-sm hover:ring-2 hover:ring-brand-300"
            >
              <Icon name={t.icon} className="size-8 text-brand-700" />
              <span className="text-sm font-bold">{t.name}</span>
              <span className="font-mono text-[11px] text-muted">{t.alias}</span>
            </button>
          ))}
        </div>
      </SidePanel>

      {/* Block editor */}
      <SidePanel
        open={!!editing}
        onClose={() => setEditing(null)}
        width={860}
        title={
          <span className="flex items-center gap-2">
            <Icon name={editingSchema?.icon ?? "Blocks"} className="size-5 text-brand-700" />
            {editing?.isNew ? "Add" : "Edit"} {editingSchema?.name}
          </span>
        }
        footer={
          <>
            <Button look="ghost" onClick={() => setEditing(null)}>Close</Button>
            <Button look="positive" onClick={submit}>{editing?.isNew ? "Create" : "Update"}</Button>
          </>
        }
      >
        {editing && editingSchema && (
          <div className="space-y-5">
            {editingSchema.groups.length === 0 && (
              <Box>
                <p className="text-sm text-muted">This Element Type has no properties yet.</p>
              </Box>
            )}
            {editingSchema.groups.map((g) => (
              <Box key={g.id} headline={g.name}>
                {g.properties.map((p) => (
                  <PropertyRow key={p.id} label={p.name} description={p.description} mandatory={p.mandatory} error={editingErrors[p.alias]}>
                    <PropertyEditor
                      editorAlias={p.editorAlias}
                      config={p.config}
                      value={editing.block.values[p.alias]}
                      onChange={(v) =>
                        setEditing((e) => e && { ...e, block: { ...e.block, values: { ...e.block.values, [p.alias]: v } } })
                      }
                    />
                  </PropertyRow>
                ))}
              </Box>
            ))}
          </div>
        )}
      </SidePanel>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted hover:bg-black/5 disabled:pointer-events-none disabled:opacity-30 [&>svg]:size-4",
        danger ? "hover:text-brand-700" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
