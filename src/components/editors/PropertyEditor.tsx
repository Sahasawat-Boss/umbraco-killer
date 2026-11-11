"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Plus,
  Quote,
  RemoveFormatting,
  Underline,
  Unlink,
  X,
  GripVertical,
} from "lucide-react";
import { Input, Select, Textarea, Toggle, Button } from "../ui";
import { cn } from "@/lib/utils";
import { MediaPickerPanel, ContentPickerPanel, useDocLookup, useMediaLookup } from "./Pickers";
import { Icon } from "@/lib/icons";

export interface EditorProps {
  editorAlias: string;
  config: Record<string, unknown>;
  value: unknown;
  onChange: (v: unknown) => void;
  invalid?: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
const items = (c: Record<string, unknown>) => (Array.isArray(c.items) ? (c.items as string[]) : []);

export function PropertyEditor({ editorAlias, config, value, onChange, invalid }: EditorProps) {
  switch (editorAlias) {
    case "Killer.TextBox": {
      const max = Number(config.maxChars) || 0;
      const v = str(value);
      return (
        <div>
          <Input value={v} onChange={(e) => onChange(e.target.value)} invalid={invalid} maxLength={max || undefined} />
          {max > 0 && v.length > max * 0.8 && <div className="mt-1 text-xs text-muted">{v.length} / {max} characters</div>}
        </div>
      );
    }
    case "Killer.EmailAddress":
      return <Input type="email" value={str(value)} onChange={(e) => onChange(e.target.value)} invalid={invalid} />;
    case "Killer.TextArea": {
      const max = Number(config.maxChars) || 0;
      const v = str(value);
      return (
        <div>
          <Textarea rows={Number(config.rows) || 4} value={v} onChange={(e) => onChange(e.target.value)} invalid={invalid} maxLength={max || undefined} />
          {max > 0 && <div className="mt-1 text-xs text-muted">{v.length} / {max} characters</div>}
        </div>
      );
    }
    case "Killer.Integer":
    case "Killer.Decimal":
      return (
        <Input
          type="number"
          className="max-w-[220px]"
          value={value === null || value === undefined ? "" : String(value)}
          min={config.min as number | undefined}
          max={config.max as number | undefined}
          step={(config.step as number) || (editorAlias === "Killer.Integer" ? 1 : "any")}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(null);
            onChange(editorAlias === "Killer.Integer" ? parseInt(raw, 10) : parseFloat(raw));
          }}
          invalid={invalid}
        />
      );
    case "Killer.Toggle":
      return (
        <Toggle
          checked={value === undefined ? !!config.default : !!value}
          onChange={onChange}
          label={str(config.labelOn) || undefined}
        />
      );
    case "Killer.DateTime":
      return (
        <Input
          type={config.includeTime ? "datetime-local" : "date"}
          className="max-w-[260px]"
          value={str(value)}
          onChange={(e) => onChange(e.target.value)}
          invalid={invalid}
        />
      );
    case "Killer.Dropdown":
      if (config.multiple) {
        return (
          <Select
            multiple
            className="h-auto min-h-24 py-1"
            value={arr(value)}
            onChange={(e) => onChange([...e.target.selectedOptions].map((o) => o.value))}
          >
            {items(config).map((i) => <option key={i}>{i}</option>)}
          </Select>
        );
      }
      return (
        <Select className="max-w-sm" value={str(value)} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {items(config).map((i) => <option key={i}>{i}</option>)}
        </Select>
      );
    case "Killer.CheckBoxList": {
      const sel = arr(value);
      return (
        <div className="flex flex-col gap-2">
          {items(config).map((i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-brand-600"
                checked={sel.includes(i)}
                onChange={(e) => onChange(e.target.checked ? [...sel, i] : sel.filter((x) => x !== i))}
              />
              {i}
            </label>
          ))}
          {!items(config).length && <span className="text-sm text-muted">No options configured on this Data Type</span>}
        </div>
      );
    }
    case "Killer.RadioButtonList":
      return (
        <div className="flex flex-col gap-2">
          {items(config).map((i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="radio" className="size-4 accent-brand-600" checked={str(value) === i} onChange={() => onChange(i)} />
              {i}
            </label>
          ))}
          {!items(config).length && <span className="text-sm text-muted">No options configured on this Data Type</span>}
        </div>
      );
    case "Killer.ColorPicker": {
      const colors = Array.isArray(config.colors) ? (config.colors as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onChange(str(value) === c ? "" : c)}
              className={cn(
                "size-10 rounded-[4px] border border-black/10 transition",
                str(value) === c && "ring-2 ring-brand-600 ring-offset-2",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      );
    }
    case "Killer.Tags":
      return <TagsEditor value={arr(value)} onChange={onChange} />;
    case "Killer.MultipleTextString":
      return <MultiText value={arr(value)} onChange={onChange} max={Number(config.max) || 0} />;
    case "Killer.Label":
      return <div className="text-sm text-muted">{str(value) || "—"}</div>;
    case "Killer.RichText":
      return <RichText value={str(value)} onChange={onChange} height={Number(config.height) || 260} invalid={invalid} />;
    case "Killer.MediaPicker":
      return <MediaPickerEditor value={arr(value)} onChange={onChange} multiple={!!config.multiple} onlyImages={!!config.onlyImages} />;
    case "Killer.ContentPicker":
      return <ContentPickerEditor value={arr(value)} onChange={onChange} multiple={!!config.multiple} />;
    default:
      return <div className="text-sm text-muted">Unknown editor: {editorAlias}</div>;
  }
}

function TagsEditor({ value, onChange }: { value: string[]; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[3px] border border-line bg-white p-1.5 focus-within:border-brand-500">
      {value.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-full bg-brand-600 py-0.5 pr-1 pl-2.5 text-xs font-bold text-white">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-white/20">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder="Enter tag and press Enter"
        className="min-w-[160px] flex-1 px-1 text-sm outline-none"
      />
    </div>
  );
}

function MultiText({ value, onChange, max }: { value: string[]; onChange: (v: unknown) => void; max: number }) {
  const list = value;
  return (
    <div className="space-y-2">
      {list.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted" />
          <Input value={v} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="rounded p-1.5 text-muted hover:bg-black/5 hover:text-brand-700">
            <X className="size-4" />
          </button>
        </div>
      ))}
      {(!max || list.length < max) && (
        <Button type="button" look="outline" compact onClick={() => onChange([...list, ""])}>
          <Plus className="size-4" /> Add
        </Button>
      )}
    </div>
  );
}

function RichText({ value, onChange, height, invalid }: { value: string; onChange: (v: string) => void; height: number; invalid?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(false);
  const [pickImage, setPickImage] = useState(false);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value && document.activeElement !== ref.current) {
      ref.current.innerHTML = value;
    }
  }, [value, source]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };
  const saveSel = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) savedRange.current = s.getRangeAt(0).cloneRange();
  };

  const tools: { icon: React.ReactNode; title: string; run: () => void }[] = [
    { icon: <Bold className="size-4" />, title: "Bold", run: () => exec("bold") },
    { icon: <Italic className="size-4" />, title: "Italic", run: () => exec("italic") },
    { icon: <Underline className="size-4" />, title: "Underline", run: () => exec("underline") },
    { icon: <Heading2 className="size-4" />, title: "Heading 2", run: () => exec("formatBlock", "<h2>") },
    { icon: <Heading3 className="size-4" />, title: "Heading 3", run: () => exec("formatBlock", "<h3>") },
    { icon: <Pilcrow className="size-4" />, title: "Paragraph", run: () => exec("formatBlock", "<p>") },
    { icon: <List className="size-4" />, title: "Bullet list", run: () => exec("insertUnorderedList") },
    { icon: <ListOrdered className="size-4" />, title: "Numbered list", run: () => exec("insertOrderedList") },
    { icon: <Quote className="size-4" />, title: "Blockquote", run: () => exec("formatBlock", "<blockquote>") },
    {
      icon: <Link2 className="size-4" />,
      title: "Insert link",
      run: () => {
        const url = prompt("Link URL", "https://");
        if (url) exec("createLink", url);
      },
    },
    { icon: <Unlink className="size-4" />, title: "Remove link", run: () => exec("unlink") },
    { icon: <ImagePlus className="size-4" />, title: "Insert media", run: () => { saveSel(); setPickImage(true); } },
    { icon: <RemoveFormatting className="size-4" />, title: "Clear formatting", run: () => exec("removeFormat") },
  ];

  return (
    <div className={cn("overflow-hidden rounded-[3px] border bg-white", invalid ? "border-brand-600" : "border-line")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-[#faf7f7] p-1">
        {!source &&
          tools.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={t.run}
              className="rounded p-1.5 text-ink/80 hover:bg-brand-100 hover:text-brand-800"
            >
              {t.icon}
            </button>
          ))}
        <button
          type="button"
          title="Source code"
          onClick={() => setSource((s) => !s)}
          className={cn("ml-auto flex items-center gap-1 rounded px-2 py-1.5 text-xs font-bold hover:bg-brand-100", source && "bg-brand-100 text-brand-800")}
        >
          <Code2 className="size-4" /> HTML
        </button>
      </div>
      {source ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full p-3 font-mono text-[13px] outline-none"
          style={{ height }}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(ref.current?.innerHTML ?? "")}
          onKeyUp={saveSel}
          onMouseUp={saveSel}
          className="rte overflow-y-auto p-3 outline-none"
          style={{ minHeight: height, maxHeight: height * 2.5 }}
        />
      )}
      <MediaPickerPanel
        open={pickImage}
        onClose={() => setPickImage(false)}
        multiple={false}
        onlyImages
        onPick={(picked) => {
          setPickImage(false);
          const m = picked[0];
          if (!m?.url) return;
          ref.current?.focus();
          if (savedRange.current) {
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(savedRange.current);
          }
          exec("insertHTML", `<img src="${m.url}" alt="${m.name.replace(/"/g, "&quot;")}" data-media-id="${m.id}" />`);
        }}
      />
    </div>
  );
}

function MediaPickerEditor({ value, onChange, multiple, onlyImages }: { value: string[]; onChange: (v: unknown) => void; multiple: boolean; onlyImages: boolean }) {
  const [open, setOpen] = useState(false);
  const lookup = useMediaLookup(value);
  return (
    <div className="flex flex-wrap gap-3">
      {value.map((id) => {
        const m = lookup[id];
        return (
          <div key={id} className="group relative size-[130px] overflow-hidden rounded-[4px] border border-line bg-[repeating-conic-gradient(#f3eded_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
            {m?.url && m.mediaType === "Image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs">
                <Icon name={m ? "File" : "Skull"} className="size-6 text-brand-700" />
                {m ? m.name : "Missing item"}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-xs text-white">{m?.name ?? id}</div>
            <button
              type="button"
              onClick={() => onChange(multiple ? value.filter((x) => x !== id) : null)}
              className="absolute top-1 right-1 hidden rounded-full bg-white p-1 shadow group-hover:block"
              aria-label="Remove"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
      {(multiple || value.length === 0) && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-[130px] flex-col items-center justify-center gap-1 rounded-[4px] border-2 border-dashed border-line text-sm font-bold text-muted hover:border-brand-400 hover:text-brand-700"
        >
          <Plus className="size-5" /> Choose
        </button>
      )}
      <MediaPickerPanel
        open={open}
        onClose={() => setOpen(false)}
        multiple={multiple}
        onlyImages={onlyImages}
        onPick={(picked) => {
          setOpen(false);
          const ids = picked.map((p) => p.id);
          onChange(multiple ? [...new Set([...value, ...ids])] : ids[0] ?? null);
        }}
      />
    </div>
  );
}

function ContentPickerEditor({ value, onChange, multiple }: { value: string[]; onChange: (v: unknown) => void; multiple: boolean }) {
  const [open, setOpen] = useState(false);
  const lookup = useDocLookup(value);
  return (
    <div className="space-y-2">
      {value.map((id) => (
        <div key={id} className="flex items-center gap-3 rounded-[4px] border border-line bg-white px-3 py-2">
          <Icon name={lookup[id]?.icon ?? "FileText"} className="size-4 text-brand-800" />
          <span className={cn("flex-1 text-sm font-bold", !lookup[id] && "text-muted italic")}>{lookup[id]?.name ?? "Missing item"}</span>
          <a href={`/umbraco/section/content/edit/${id}`} className="text-xs text-brand-700 hover:underline">Open</a>
          <button type="button" onClick={() => onChange(multiple ? value.filter((x) => x !== id) : null)} className="text-muted hover:text-brand-700">
            <X className="size-4" />
          </button>
        </div>
      ))}
      {(multiple || value.length === 0) && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-full items-center justify-center gap-1 rounded-[4px] border-2 border-dashed border-line text-sm font-bold text-muted hover:border-brand-400 hover:text-brand-700"
        >
          <Plus className="size-4" /> Choose
        </button>
      )}
      <ContentPickerPanel
        open={open}
        onClose={() => setOpen(false)}
        multiple={multiple}
        onPick={(ids) => {
          setOpen(false);
          onChange(multiple ? [...new Set([...value, ...ids])] : ids[0] ?? null);
        }}
      />
    </div>
  );
}
