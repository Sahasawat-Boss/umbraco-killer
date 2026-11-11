"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Lock, LockOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Workspace, NameInput } from "./Workspace";
import { Box, Button, Checkbox, Input, PropertyRow, SidePanel, Textarea, Toggle } from "../ui";
import { useToast } from "../toast";
import { Icon, PICKABLE_ICONS } from "@/lib/icons";
import { getEditor } from "@/lib/editors";
import { cn, toAlias } from "@/lib/utils";
import { saveDocumentType, type DocumentTypeInput, type GroupInput, type PropertyInput } from "@/actions/settings";

type Prop = PropertyInput & { key: string };
type Group = Omit<GroupInput, "properties"> & { key: string; properties: Prop[] };
type DataTypeOpt = { id: string; name: string; editorAlias: string };

let seq = 0;
const tmpKey = () => `tmp-${++seq}-${Math.random().toString(36).slice(2, 7)}`;

export function DocumentTypeEditor({
  docType,
  dataTypes,
  allDocTypes,
  usage,
}: {
  docType?: DocumentTypeInput & { id: string };
  dataTypes: DataTypeOpt[];
  allDocTypes: { id: string; name: string; icon: string }[];
  usage: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState("design");
  const [name, setName] = useState(docType?.name ?? "");
  const [alias, setAlias] = useState(docType?.alias ?? "");
  const [aliasLocked, setAliasLocked] = useState(!!docType);
  const [icon, setIcon] = useState(docType?.icon ?? "FileText");
  const [description, setDescription] = useState(docType?.description ?? "");
  const [allowedAtRoot, setAllowedAtRoot] = useState(docType?.allowedAtRoot ?? false);
  const [isElement, setIsElement] = useState(docType?.isElement ?? false);
  const [allowedChildIds, setAllowedChildIds] = useState<string[]>(docType?.allowedChildIds ?? []);
  const [groups, setGroups] = useState<Group[]>(
    docType?.groups.map((g) => ({ ...g, key: g.id ?? tmpKey(), properties: g.properties.map((p) => ({ ...p, key: p.id ?? tmpKey() })) })) ?? [
      { key: tmpKey(), name: "Content", properties: [] },
    ],
  );
  const [editing, setEditing] = useState<{ groupKey: string; prop: Prop } | null>(null);
  const [iconPicker, setIconPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const effectiveAlias = aliasLocked ? alias : toAlias(name);

  const save = async () => {
    setBusy(true);
    const r = await saveDocumentType({
      id: docType?.id,
      name,
      alias: effectiveAlias,
      icon,
      description,
      allowedAtRoot,
      isElement,
      allowedChildIds,
      groups: groups.map(({ key: _k, properties, ...g }) => ({ ...g, properties: properties.map(({ key: _pk, ...p }) => p) })),
    });
    setBusy(false);
    if (!r.ok) return toast({ tone: "danger", headline: "Save failed", message: r.error });
    toast({ tone: "positive", headline: "Document Type saved" });
    if (!docType) router.replace(`/umbraco/section/settings/document-types/${r.id}`);
    else router.refresh();
  };

  const updateGroup = (key: string, fn: (g: Group) => Group) => setGroups((gs) => gs.map((g) => (g.key === key ? fn(g) : g)));
  const moveIn = <T,>(list: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const n = [...list];
    [n[i], n[j]] = [n[j]!, n[i]!];
    return n;
  };
  const dtById = new Map(dataTypes.map((d) => [d.id, d]));

  return (
    <Workspace
      icon={undefined}
      backHref="/umbraco/section/settings/document-types"
      name={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIconPicker(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-dashed border-brand-300 bg-brand-50 text-brand-700 hover:border-brand-600"
            title="Change icon"
          >
            <Icon name={icon} className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <NameInput
              value={name}
              onChange={setName}
              placeholder="Enter a name for the Document Type..."
              aliasSlot={
                <div className="flex items-center gap-1 rounded-[3px] border border-line bg-surface pl-2 text-xs">
                  <span className="text-muted">alias</span>
                  <input
                    value={effectiveAlias}
                    disabled={!aliasLocked}
                    onChange={(e) => setAlias(e.target.value)}
                    className="w-36 bg-transparent px-1 py-1.5 font-mono outline-none disabled:text-muted"
                  />
                  <button
                    onClick={() => {
                      if (!aliasLocked) setAlias(effectiveAlias);
                      setAliasLocked((l) => !l);
                    }}
                    className="p-1.5 text-muted hover:text-brand-700"
                    title={aliasLocked ? "Auto-generate from name" : "Edit alias manually"}
                  >
                    {aliasLocked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                  </button>
                </div>
              }
            />
          </div>
        </div>
      }
      tabs={[
        { key: "design", label: "Design", icon: "LayoutTemplate" },
        { key: "structure", label: "Structure", icon: "List" },
        { key: "settings", label: "Settings", icon: "Code" },
      ]}
      activeTab={view}
      onTab={setView}
      breadcrumbs={[
        { name: "Settings", href: "/umbraco/section/settings" },
        { name: "Document Types", href: "/umbraco/section/settings/document-types" },
        { name: name || "New" },
      ]}
      actions={<Button look="positive" busy={busy} onClick={save}>Save</Button>}
    >
      {view === "design" && (
        <div className="mx-auto max-w-[1100px] space-y-5">
          {groups.map((g, gi) => (
            <Box
              key={g.key}
              headline={
                <input
                  value={g.name}
                  onChange={(e) => updateGroup(g.key, (x) => ({ ...x, name: e.target.value }))}
                  placeholder="Group name"
                  className="rounded-[3px] border border-transparent px-1 py-0.5 font-bold outline-none hover:border-line focus:border-brand-500"
                />
              }
              actions={
                <div className="flex items-center gap-1 text-muted">
                  <button onClick={() => setGroups((gs) => moveIn(gs, gi, -1))} className="rounded p-1 hover:bg-black/5" aria-label="Move up"><ArrowUp className="size-4" /></button>
                  <button onClick={() => setGroups((gs) => moveIn(gs, gi, 1))} className="rounded p-1 hover:bg-black/5" aria-label="Move down"><ArrowDown className="size-4" /></button>
                  <button
                    onClick={() => {
                      if (g.properties.length && !confirm(`Delete group "${g.name}" and its ${g.properties.length} properties? Content values for those properties will be lost.`)) return;
                      setGroups((gs) => gs.filter((x) => x.key !== g.key));
                    }}
                    className="rounded p-1 hover:bg-black/5 hover:text-brand-700"
                    aria-label="Delete group"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              }
            >
              <div className="space-y-2">
                {g.properties.map((p, pi) => {
                  const dt = dtById.get(p.dataTypeId);
                  return (
                    <div key={p.key} className="group flex items-center gap-4 rounded-[4px] border border-line bg-white px-4 py-3 hover:border-brand-300">
                      <div className="w-56 min-w-0">
                        <div className="truncate font-bold">
                          {p.name}
                          {p.mandatory && <span className="text-brand-600">*</span>}
                        </div>
                        <div className="truncate font-mono text-xs text-muted">{toAlias(p.alias || p.name)}</div>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[3px] bg-surface px-3 py-2 text-sm">
                        <Icon name={dt ? getEditor(dt.editorAlias).icon : "Database"} className="size-4 text-brand-700" />
                        <span className="truncate">{dt?.name ?? "Missing data type"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => updateGroup(g.key, (x) => ({ ...x, properties: moveIn(x.properties, pi, -1) }))} className="rounded p-1 hover:bg-black/5"><ArrowUp className="size-4" /></button>
                        <button onClick={() => updateGroup(g.key, (x) => ({ ...x, properties: moveIn(x.properties, pi, 1) }))} className="rounded p-1 hover:bg-black/5"><ArrowDown className="size-4" /></button>
                        <button onClick={() => setEditing({ groupKey: g.key, prop: p })} className="rounded p-1 hover:bg-black/5 hover:text-brand-700"><Pencil className="size-4" /></button>
                        <button onClick={() => updateGroup(g.key, (x) => ({ ...x, properties: x.properties.filter((y) => y.key !== p.key) }))} className="rounded p-1 hover:bg-black/5 hover:text-brand-700"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() =>
                    setEditing({
                      groupKey: g.key,
                      prop: { key: tmpKey(), alias: "", name: "", description: "", dataTypeId: "", mandatory: false, validationRegex: "" },
                    })
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[4px] border-2 border-dashed border-line font-bold text-muted hover:border-brand-400 hover:text-brand-700"
                >
                  <Plus className="size-4" /> Add property
                </button>
              </div>
            </Box>
          ))}
          <button
            onClick={() => setGroups((gs) => [...gs, { key: tmpKey(), name: "New group", properties: [] }])}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[6px] border-2 border-dashed border-brand-200 font-bold text-brand-700 hover:border-brand-500 hover:bg-white"
          >
            <Plus className="size-5" /> Add group
          </button>
        </div>
      )}

      {view === "structure" && (
        <div className="mx-auto max-w-[1100px] space-y-5">
          <Box headline="Permissions">
            <PropertyRow label="Allow at root" description="Allow editors to create content of this type in the root of the content tree.">
              <Toggle checked={allowedAtRoot} onChange={setAllowedAtRoot} />
            </PropertyRow>
            <PropertyRow label="Allowed child node types" description="Allow content of the specified types to be created underneath content of this type.">
              <div className="grid gap-2 sm:grid-cols-2">
                {allDocTypes.map((t) => (
                  <label
                    key={t.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[4px] border px-3 py-2 text-sm",
                      allowedChildIds.includes(t.id) ? "border-brand-400 bg-brand-50" : "border-line bg-white",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-600"
                      checked={allowedChildIds.includes(t.id)}
                      onChange={(e) => setAllowedChildIds((ids) => (e.target.checked ? [...ids, t.id] : ids.filter((x) => x !== t.id)))}
                    />
                    <Icon name={t.icon} className="size-4 text-brand-700" />
                    <span className="font-bold">{t.name}</span>
                  </label>
                ))}
                {!docType && <span className="text-sm text-muted">Tip: save first to allow this type as its own child.</span>}
              </div>
            </PropertyRow>
          </Box>
        </div>
      )}

      {view === "settings" && (
        <div className="mx-auto max-w-[1100px] space-y-5">
          <Box headline="Settings">
            <PropertyRow label="Description" description="Shown to editors when creating content.">
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </PropertyRow>
            <PropertyRow label="Element type" description="An element type is meant to be used inside other content (e.g. blocks) and can't be created in the content tree.">
              <Toggle checked={isElement} onChange={setIsElement} />
            </PropertyRow>
            {docType && (
              <PropertyRow label="Usage">
                <span className="text-sm text-muted">Used by {usage} content item(s)</span>
              </PropertyRow>
            )}
          </Box>
        </div>
      )}

      {editing && (
        <PropertySettings
          initial={editing.prop}
          dataTypes={dataTypes}
          onClose={() => setEditing(null)}
          onSubmit={(p) => {
            updateGroup(editing.groupKey, (g) => ({
              ...g,
              properties: g.properties.some((x) => x.key === p.key) ? g.properties.map((x) => (x.key === p.key ? p : x)) : [...g.properties, p],
            }));
            setEditing(null);
          }}
        />
      )}

      <SidePanel open={iconPicker} onClose={() => setIconPicker(false)} title="Select icon" width={560}>
        <div className="grid grid-cols-7 gap-2">
          {PICKABLE_ICONS.map((n) => (
            <button
              key={n}
              title={n}
              onClick={() => {
                setIcon(n);
                setIconPicker(false);
              }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-[4px] bg-white hover:bg-brand-50 hover:text-brand-700",
                icon === n && "bg-brand-600 text-white hover:bg-brand-600 hover:text-white",
              )}
            >
              <Icon name={n} className="size-5" />
            </button>
          ))}
        </div>
      </SidePanel>
    </Workspace>
  );
}

function PropertySettings({
  initial,
  dataTypes,
  onClose,
  onSubmit,
}: {
  initial: Prop;
  dataTypes: DataTypeOpt[];
  onClose: () => void;
  onSubmit: (p: Prop) => void;
}) {
  const [p, setP] = useState<Prop>(initial);
  const [aliasManual, setAliasManual] = useState(!!initial.alias);
  const [error, setError] = useState("");
  const alias = aliasManual ? p.alias : toAlias(p.name);
  return (
    <SidePanel
      open
      onClose={onClose}
      title={initial.name ? `Edit ${initial.name}` : "Add property"}
      width={620}
      footer={
        <>
          <Button look="ghost" onClick={onClose}>Close</Button>
          <Button
            look="primary"
            onClick={() => {
              if (!p.name.trim()) return setError("Please enter a name");
              if (!p.dataTypeId) return setError("Please select a Data Type");
              onSubmit({ ...p, alias });
            }}
          >
            Submit
          </Button>
        </>
      }
    >
      <div className="space-y-4 rounded-[6px] bg-white p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Name</span>
          <Input autoFocus value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Enter a name..." />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-sm font-bold">
            Alias
            <button type="button" onClick={() => { if (!aliasManual) setP({ ...p, alias }); setAliasManual((m) => !m); }} className="text-xs font-normal text-brand-700 hover:underline">
              {aliasManual ? "auto-generate" : "edit manually"}
            </button>
          </span>
          <Input value={alias} disabled={!aliasManual} onChange={(e) => setP({ ...p, alias: e.target.value })} className="font-mono" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Description</span>
          <Textarea rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} placeholder="Enter a description..." />
        </label>
      </div>
      <div className="mt-4 rounded-[6px] bg-white p-5">
        <div className="mb-2 text-sm font-bold">Data Type</div>
        <div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto pr-1">
          {dataTypes.map((d) => (
            <button
              key={d.id}
              onClick={() => setP({ ...p, dataTypeId: d.id })}
              className={cn(
                "flex items-center gap-2 rounded-[4px] border px-3 py-2 text-left text-sm",
                p.dataTypeId === d.id ? "border-brand-500 bg-brand-50 font-bold" : "border-line hover:border-brand-300",
              )}
            >
              <Icon name={getEditor(d.editorAlias).icon} className="size-4 shrink-0 text-brand-700" />
              <span className="truncate">{d.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3 rounded-[6px] bg-white p-5">
        <div className="text-sm font-bold">Validation</div>
        <Checkbox checked={p.mandatory} onChange={(v) => setP({ ...p, mandatory: v })} label="Field is mandatory" />
        <Input value={p.validationRegex} onChange={(e) => setP({ ...p, validationRegex: e.target.value })} placeholder="Custom validation (regular expression)" className="font-mono" />
      </div>
      {error && <p className="mt-3 text-sm font-bold text-brand-700">{error}</p>}
    </SidePanel>
  );
}
