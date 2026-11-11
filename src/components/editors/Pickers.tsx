"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Folder, Upload, Check, FileIcon } from "lucide-react";
import { listDocumentsForPicker, listMediaForPicker, type PickerDoc, type PickerMedia } from "@/actions/pickers";
import { uploadMedia } from "@/actions/media";
import { Button, SidePanel } from "../ui";
import { PickTree } from "../backoffice/DocPicker";
import { cn } from "@/lib/utils";

let mediaCache: Promise<PickerMedia[]> | null = null;
let docCache: Promise<PickerDoc[]> | null = null;
const loadMedia = (force = false) => (force || !mediaCache ? (mediaCache = listMediaForPicker()) : mediaCache);
const loadDocs = (force = false) => (force || !docCache ? (docCache = listDocumentsForPicker()) : docCache);

export function useMediaLookup(ids: string[]) {
  const [map, setMap] = useState<Record<string, PickerMedia>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!ids.length) return;
    let alive = true;
    loadMedia(ids.some((id) => !map[id])).then((list) => alive && setMap(Object.fromEntries(list.map((m) => [m.id, m]))));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

export function useDocLookup(ids: string[]) {
  const [map, setMap] = useState<Record<string, PickerDoc>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!ids.length) return;
    let alive = true;
    loadDocs(true).then((list) => alive && setMap(Object.fromEntries(list.map((d) => [d.id, d]))));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

export function MediaPickerPanel({
  open,
  onClose,
  multiple,
  onlyImages,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  multiple: boolean;
  onlyImages: boolean;
  onPick: (items: PickerMedia[]) => void;
}) {
  const [all, setAll] = useState<PickerMedia[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelected([]);
      loadMedia(true).then(setAll);
    }
  }, [open]);

  const crumbs: PickerMedia[] = [];
  let cur = folder;
  while (cur) {
    const f = all.find((m) => m.id === cur);
    if (!f) break;
    crumbs.unshift(f);
    cur = f.parentId;
  }
  const visible = (q ? all.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())) : all.filter((m) => m.parentId === folder)).sort(
    (a, b) => (a.mediaType === "Folder" ? -1 : 0) - (b.mediaType === "Folder" ? -1 : 0),
  );

  const toggle = (m: PickerMedia) => {
    if (m.mediaType === "Folder") return setFolder(m.id);
    if (onlyImages && m.mediaType !== "Image") return;
    if (!multiple) return onPick([m]);
    setSelected((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]));
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Select media"
      width={760}
      footer={
        <>
          <Button look="ghost" onClick={onClose}>Close</Button>
          {multiple && (
            <Button look="primary" disabled={!selected.length} onClick={() => onPick(all.filter((m) => selected.includes(m.id)))}>
              Select {selected.length > 0 && `(${selected.length})`}
            </Button>
          )}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search media..."
          className="h-9 flex-1 rounded-[3px] border border-line bg-white px-2.5 text-sm outline-none focus:border-brand-500"
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept={onlyImages ? "image/*" : undefined}
          onChange={async (e) => {
            if (!e.target.files?.length) return;
            setBusy(true);
            const fd = new FormData();
            [...e.target.files].forEach((f) => fd.append("files", f));
            if (folder) fd.append("parentId", folder);
            await uploadMedia(fd);
            setAll(await loadMedia(true));
            setBusy(false);
            e.target.value = "";
          }}
        />
        <Button look="outline" busy={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Upload
        </Button>
      </div>
      {!q && (
        <div className="mb-3 flex items-center gap-1 text-sm">
          <button onClick={() => setFolder(null)} className="font-bold hover:text-brand-700">Media</button>
          {crumbs.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted" />
              <button onClick={() => setFolder(c.id)} className="font-bold hover:text-brand-700">{c.name}</button>
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {visible.map((m) => {
          const disabled = onlyImages && m.mediaType === "File";
          const sel = selected.includes(m.id);
          return (
            <button
              key={m.id}
              disabled={disabled}
              onClick={() => toggle(m)}
              className={cn(
                "relative flex aspect-square flex-col overflow-hidden rounded-[4px] border bg-white text-left transition disabled:opacity-40",
                sel ? "border-brand-600 ring-2 ring-brand-500" : "border-line hover:border-brand-400",
              )}
            >
              <div className="flex min-h-0 flex-1 items-center justify-center bg-[repeating-conic-gradient(#f3eded_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                {m.mediaType === "Image" && m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} className="size-full object-cover" />
                ) : m.mediaType === "Folder" ? (
                  <Folder className="size-12 fill-brand-100 text-brand-600" />
                ) : (
                  <FileIcon className="size-10 text-brand-700" />
                )}
              </div>
              <div className="truncate px-2 py-1.5 text-xs font-bold">{m.name}</div>
              {sel && (
                <span className="absolute top-1.5 right-1.5 rounded-full bg-brand-600 p-0.5 text-white">
                  <Check className="size-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!visible.length && <div className="py-12 text-center text-sm text-muted">This folder is empty. Upload something!</div>}
    </SidePanel>
  );
}

export function ContentPickerPanel({
  open,
  onClose,
  multiple,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  multiple: boolean;
  onPick: (ids: string[]) => void;
}) {
  const [docs, setDocs] = useState<PickerDoc[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => {
    if (open) {
      setSel([]);
      loadDocs(true).then(setDocs);
    }
  }, [open]);
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Choose content"
      footer={
        <>
          <Button look="ghost" onClick={onClose}>Close</Button>
          {multiple && <Button look="primary" disabled={!sel.length} onClick={() => onPick(sel)}>Choose</Button>}
        </>
      }
    >
      <PickTree
        nodes={docs.map((d) => ({ ...d, muted: !d.published }))}
        selected={sel}
        multiple={multiple}
        onSelect={(id) => {
          if (!id) return;
          if (!multiple) return onPick([id]);
          setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
        }}
      />
    </SidePanel>
  );
}
