"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Workspace, NameInput } from "./Workspace";
import { Box, Button, Input, PropertyRow, SidePanel, Toggle } from "../ui";
import { useToast } from "../toast";
import { EDITORS, getEditor, type ConfigField } from "@/lib/editors";
import { Icon } from "@/lib/icons";
import { saveDataType } from "@/actions/settings";
import { PropertyEditor } from "../editors/PropertyEditor";

export function DataTypeEditor({
  dataType,
  usedBy,
}: {
  dataType?: { id: string; name: string; editorAlias: string; config: Record<string, unknown> };
  usedBy: { docType: string; docTypeId: string; property: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(dataType?.name ?? "");
  const [editorAlias, setEditorAlias] = useState(dataType?.editorAlias ?? "");
  const [config, setConfig] = useState<Record<string, unknown>>(dataType?.config ?? {});
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<unknown>(undefined);
  const editor = editorAlias ? getEditor(editorAlias) : null;

  const save = async () => {
    setBusy(true);
    const r = await saveDataType({ id: dataType?.id, name, editorAlias, config });
    setBusy(false);
    if (!r.ok) return toast({ tone: "danger", headline: "Save failed", message: r.error });
    toast({ tone: "positive", headline: "Data Type saved" });
    if (!dataType) router.replace(`/umbraco/section/settings/data-types/${r.id}`);
    else router.refresh();
  };

  return (
    <Workspace
      icon={editor?.icon ?? "Database"}
      backHref="/umbraco/section/settings/data-types"
      name={<NameInput value={name} onChange={setName} placeholder="Enter a name for the Data Type..." />}
      breadcrumbs={[{ name: "Settings", href: "/umbraco/section/settings" }, { name: "Data Types", href: "/umbraco/section/settings/data-types" }, { name: name || "New" }]}
      actions={<Button look="positive" busy={busy} onClick={save}>Save</Button>}
    >
      <div className="mx-auto max-w-[1100px] space-y-5">
        <Box headline="Property editor">
          {editor ? (
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-[6px] bg-brand-50 text-brand-700">
                <Icon name={editor.icon} className="size-7" />
              </div>
              <div className="flex-1">
                <div className="font-bold">{editor.name}</div>
                <div className="font-mono text-xs text-muted">{editor.alias}</div>
              </div>
              <Button look="outline" onClick={() => setPicking(true)}>Change</Button>
            </div>
          ) : (
            <button
              onClick={() => setPicking(true)}
              className="flex h-24 w-full items-center justify-center gap-2 rounded-[6px] border-2 border-dashed border-line font-bold text-muted hover:border-brand-400 hover:text-brand-700"
            >
              <Plus className="size-5" /> Select a property editor
            </button>
          )}
        </Box>
        {editor && editor.configFields.length > 0 && (
          <Box headline="Settings">
            {editor.configFields.map((f) => (
              <PropertyRow key={f.key} label={f.label} description={f.description}>
                <ConfigInput field={f} value={config[f.key]} onChange={(v) => setConfig((c) => ({ ...c, [f.key]: v }))} />
              </PropertyRow>
            ))}
          </Box>
        )}
        {editor && (
          <Box headline="Preview">
            <PropertyEditor editorAlias={editor.alias} config={config} value={preview} onChange={setPreview} />
          </Box>
        )}
        {dataType && (
          <Box headline="Used in Document Types">
            {usedBy.length ? (
              <ul className="space-y-1 text-sm">
                {usedBy.map((u, i) => (
                  <li key={i}>
                    <a className="font-bold text-brand-700 hover:underline" href={`/umbraco/section/settings/document-types/${u.docTypeId}`}>{u.docType}</a>
                    <span className="text-muted"> › {u.property}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">This Data Type isn't used by any Document Type yet.</p>
            )}
          </Box>
        )}
      </div>
      <SidePanel open={picking} onClose={() => setPicking(false)} title="Select a property editor" width={720}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {EDITORS.map((e) => (
            <button
              key={e.alias}
              onClick={() => {
                setEditorAlias(e.alias);
                setConfig({ ...e.defaultConfig });
                if (!name) setName(e.name);
                setPreview(undefined);
                setPicking(false);
              }}
              className="flex flex-col items-center gap-2 rounded-[6px] bg-white p-4 text-center shadow-sm hover:ring-2 hover:ring-brand-300"
            >
              <Icon name={e.icon} className="size-7 text-brand-700" />
              <span className="text-sm font-bold">{e.name}</span>
              <span className="text-xs text-muted">{e.description}</span>
            </button>
          ))}
        </div>
      </SidePanel>
    </Workspace>
  );
}

function ConfigInput({ field, value, onChange }: { field: ConfigField; value: unknown; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState("");
  switch (field.type) {
    case "number":
      return (
        <Input
          type="number"
          className="max-w-[200px]"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "text":
      return <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "boolean":
      return <Toggle checked={!!value} onChange={onChange} />;
    case "items":
    case "colors": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const add = () => {
        const v = draft.trim();
        if (v && !list.includes(v)) onChange([...list, v]);
        setDraft("");
      };
      return (
        <div className="space-y-2">
          {list.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {field.type === "colors" && <span className="size-8 shrink-0 rounded border border-line" style={{ background: item }} />}
              <Input value={item} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
              <button onClick={() => onChange(list.filter((_, j) => j !== i))} className="rounded p-1.5 text-muted hover:text-brand-700">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            {field.type === "colors" && (
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(draft) ? draft : "#c62828"} onChange={(e) => setDraft(e.target.value)} className="h-9 w-10 cursor-pointer rounded border border-line" />
            )}
            <Input
              placeholder={field.type === "colors" ? "#hex" : "New option"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            />
            <Button look="outline" onClick={add}><Plus className="size-4" /> Add</Button>
          </div>
        </div>
      );
    }
  }
}
