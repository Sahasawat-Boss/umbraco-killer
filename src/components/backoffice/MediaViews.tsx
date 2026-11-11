"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Check, FileIcon, Folder, FolderPlus, LayoutGrid, List as ListIcon, Trash2, Upload, Copy } from "lucide-react";
import { Tree, type MenuAction, type TreeItem } from "./Tree";
import { PickTree } from "./DocPicker";
import { Workspace, NameInput } from "./Workspace";
import { Box, Button, Dialog, Input, PropertyRow, SidePanel } from "../ui";
import { useToast } from "../toast";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { createMediaFolder, moveMedia, trashMedia, updateMedia, uploadMedia } from "@/actions/media";

export type MediaRow = {
  id: string;
  parentId: string | null;
  name: string;
  mediaType: string;
  url: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  altText: string;
  createdAt: string;
  updatedAt: string;
};

const iconFor = (t: string) => (t === "Folder" ? "Folder" : t === "Image" ? "Image" : "File");

type Modal = { kind: "folder"; parentId: string | null } | { kind: "move"; item: MediaRow } | { kind: "delete"; item: MediaRow } | null;

function useMediaModals(all: MediaRow[]) {
  const [modal, setModal] = useState<Modal>(null);
  const router = useRouter();
  const toast = useToast();
  const [folderName, setFolderName] = useState("");
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const close = () => {
    setModal(null);
    setFolderName("");
    setTarget(undefined);
  };
  const el = (
    <>
      <Dialog
        open={modal?.kind === "folder"}
        onClose={close}
        title="Create folder"
        footer={
          <>
            <Button look="ghost" onClick={close}>Cancel</Button>
            <Button
              look="primary"
              onClick={async () => {
                if (modal?.kind !== "folder") return;
                const r = await createMediaFolder(folderName, modal.parentId);
                if (!r.ok) return toast({ tone: "danger", headline: "Could not create folder", message: r.error });
                close();
                toast({ tone: "positive", headline: "Folder created" });
                router.refresh();
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <Input autoFocus placeholder="Folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
      </Dialog>
      {modal?.kind === "move" && (
        <SidePanel
          open
          onClose={close}
          title={`Move ${modal.item.name}`}
          footer={
            <>
              <Button look="ghost" onClick={close}>Close</Button>
              <Button
                look="primary"
                disabled={target === undefined}
                onClick={async () => {
                  const r = await moveMedia(modal.item.id, target ?? null);
                  if (!r.ok) return toast({ tone: "danger", headline: "Move failed", message: r.error });
                  close();
                  toast({ tone: "positive", headline: "Moved" });
                  router.refresh();
                }}
              >
                Move
              </Button>
            </>
          }
        >
          <PickTree
            rootOption="Media (root)"
            nodes={all.filter((m) => m.mediaType === "Folder").map((m) => ({ id: m.id, parentId: m.parentId, name: m.name, icon: "Folder", disabled: m.id === modal.item.id }))}
            selected={target === undefined ? [] : [target ?? "$root"]}
            onSelect={(id) => setTarget(id)}
          />
        </SidePanel>
      )}
      <Dialog
        open={modal?.kind === "delete"}
        onClose={close}
        title={`Trash ${modal?.kind === "delete" ? modal.item.name : ""}?`}
        footer={
          <>
            <Button look="ghost" onClick={close}>Cancel</Button>
            <Button
              look="danger"
              onClick={async () => {
                if (modal?.kind !== "delete") return;
                const item = modal.item;
                close();
                await trashMedia(item.id);
                toast({ tone: "positive", headline: `${item.name} moved to the Recycle Bin` });
                router.push(item.parentId ? `/umbraco/section/media/${item.parentId}` : "/umbraco/section/media");
                router.refresh();
              }}
            >
              Trash
            </Button>
          </>
        }
      >
        The item {modal?.kind === "delete" && modal.item.mediaType === "Folder" && "and everything inside it "}will be moved to the Recycle Bin.
      </Dialog>
    </>
  );
  return { setModal, el };
}

export function MediaTree({ items, trashedCount }: { items: MediaRow[]; trashedCount: number }) {
  const pathname = usePathname();
  const activeId = pathname.match(/\/media\/([0-9a-f-]{36})/)?.[1];
  const { setModal, el } = useMediaModals(items);
  const tree: TreeItem[] = items.map((m) => ({
    id: m.id,
    parentId: m.parentId,
    name: m.name,
    icon: iconFor(m.mediaType),
    href: `/umbraco/section/media/${m.id}`,
  }));
  const actions = (t: TreeItem): MenuAction[] => {
    const m = items.find((x) => x.id === t.id)!;
    return [
      ...(m.mediaType === "Folder" ? [{ label: "Create folder", icon: "Folder", onClick: () => setModal({ kind: "folder", parentId: m.id }) }] : []),
      { label: "Move to", icon: "Plane", onClick: () => setModal({ kind: "move", item: m }) },
      { label: "Delete", icon: "Skull", danger: true, separatorBefore: true, onClick: () => setModal({ kind: "delete", item: m }) },
    ];
  };
  return (
    <>
      <Tree
        items={tree}
        activeId={activeId}
        rootLabel="Media"
        rootHref="/umbraco/section/media"
        rootActions={[{ label: "Create folder", icon: "Folder", onClick: () => setModal({ kind: "folder", parentId: null }) }]}
        itemActions={actions}
        storageKey="umbk-tree-media"
        footer={
          <Link
            href="/umbraco/section/media/recycle-bin"
            className={cn("mt-1 flex h-9 items-center gap-2 pl-[38px] text-[14px] hover:bg-black/[0.04]", pathname.endsWith("/recycle-bin") && "bg-selected font-bold")}
          >
            <Trash2 className="size-[17px] text-brand-800" /> Recycle Bin
            {trashedCount > 0 && <span className="mr-3 ml-auto text-xs text-muted">{trashedCount}</span>}
          </Link>
        }
      />
      {el}
    </>
  );
}

export function MediaBrowser({
  folder,
  items,
  all,
  breadcrumbs,
}: {
  folder: MediaRow | null;
  items: MediaRow[];
  all: MediaRow[];
  breadcrumbs: { name: string; href?: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { setModal, el } = useMediaModals(all);

  const upload = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) return;
    setBusy(true);
    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
    if (folder) fd.append("parentId", folder.id);
    const r = await uploadMedia(fd);
    setBusy(false);
    toast(r.ok ? { tone: "positive", headline: `${r.count} file(s) uploaded` } : { tone: "danger", headline: "Upload failed", message: r.error });
    router.refresh();
  };

  const shown = items
    .filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.mediaType === "Folder" ? 0 : 1) - (b.mediaType === "Folder" ? 0 : 1) || a.name.localeCompare(b.name));

  return (
    <Workspace
      icon="Images"
      name={<h1 className="px-2 text-xl font-bold">{folder?.name ?? "Media"}</h1>}
      breadcrumbs={breadcrumbs}
      actions={
        selected.length > 0 ? (
          <>
            <span className="text-sm text-muted">{selected.length} selected</span>
            <Button look="ghost" onClick={() => setSelected([])}>Clear</Button>
            <Button
              look="danger"
              onClick={async () => {
                for (const id of selected) await trashMedia(id);
                setSelected([]);
                toast({ tone: "positive", headline: "Moved to the Recycle Bin" });
                router.refresh();
              }}
            >
              <Trash2 className="size-4" /> Trash
            </Button>
          </>
        ) : undefined
      }
    >
      <div
        className={cn("mx-auto max-w-[1400px] min-h-full rounded-[6px] transition", over && "bg-brand-50 ring-2 ring-brand-400 ring-dashed")}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files);
        }}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button look="primary" busy={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Upload
          </Button>
          <Button look="outline" onClick={() => setModal({ kind: "folder", parentId: folder?.id ?? null })}>
            <FolderPlus className="size-4" /> Create folder
          </Button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => e.target.files && upload(e.target.files).then(() => (e.target.value = ""))} />
          <Input placeholder="Search in this folder..." className="ml-auto max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex rounded-[3px] border border-line bg-white">
            <button onClick={() => setLayout("grid")} className={cn("p-2", layout === "grid" && "bg-selected text-brand-800")} aria-label="Grid"><LayoutGrid className="size-4" /></button>
            <button onClick={() => setLayout("list")} className={cn("p-2", layout === "list" && "bg-selected text-brand-800")} aria-label="List"><ListIcon className="size-4" /></button>
          </div>
        </div>
        {shown.length === 0 ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-[6px] border-2 border-dashed border-line bg-white py-20 text-muted hover:border-brand-400 hover:text-brand-700"
          >
            <Upload className="mb-2 size-10" />
            <span className="font-bold">Drop files here or click to upload</span>
          </button>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {shown.map((m) => {
              const sel = selected.includes(m.id);
              return (
                <div key={m.id} className={cn("group relative overflow-hidden rounded-[6px] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.12)] transition", sel ? "ring-2 ring-brand-500" : "hover:ring-2 hover:ring-brand-200")}>
                  <Link href={`/umbraco/section/media/${m.id}`} className="block">
                    <div className="flex aspect-[4/3] items-center justify-center bg-[repeating-conic-gradient(#f3eded_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                      {m.mediaType === "Image" && m.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt={m.altText || m.name} className="size-full object-cover" loading="lazy" />
                      ) : m.mediaType === "Folder" ? (
                        <Folder className="size-16 fill-brand-100 text-brand-600" />
                      ) : (
                        <FileIcon className="size-12 text-brand-700" />
                      )}
                    </div>
                    <div className="truncate px-3 py-2 text-[13px] font-bold">{m.name}</div>
                  </Link>
                  {m.mediaType !== "Folder" && (
                    <button
                      onClick={() => setSelected((s) => (sel ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                      className={cn(
                        "absolute top-2 left-2 flex size-6 items-center justify-center rounded-full border-2 border-white shadow transition",
                        sel ? "bg-brand-600 text-white" : "bg-white/70 opacity-0 group-hover:opacity-100",
                      )}
                      aria-label="Select"
                    >
                      {sel && <Check className="size-3.5" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Box>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="pb-2">Name</th><th className="pb-2">Type</th><th className="pb-2">Size</th><th className="pb-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-2">
                      <Link href={`/umbraco/section/media/${m.id}`} className="font-bold hover:text-brand-700">{m.name}</Link>
                    </td>
                    <td className="text-muted">{m.mediaType}</td>
                    <td className="text-muted">{formatBytes(m.size)}</td>
                    <td className="text-muted">{formatDate(m.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </div>
      {el}
    </Workspace>
  );
}

export function MediaItemEditor({ item, breadcrumbs, all }: { item: MediaRow; breadcrumbs: { name: string; href?: string }[]; all: MediaRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [alt, setAlt] = useState(item.altText);
  const [busy, setBusy] = useState(false);
  const { setModal, el } = useMediaModals(all);
  const absUrl = typeof window !== "undefined" && item.url ? window.location.origin + item.url : item.url;
  return (
    <Workspace
      icon={iconFor(item.mediaType)}
      name={<NameInput value={name} onChange={setName} />}
      breadcrumbs={[...breadcrumbs, { name }]}
      actions={
        <>
          <Button look="ghost" onClick={() => setModal({ kind: "move", item })}>Move</Button>
          <Button look="ghost" className="text-brand-700" onClick={() => setModal({ kind: "delete", item })}>Delete</Button>
          <Button
            look="positive"
            busy={busy}
            onClick={async () => {
              setBusy(true);
              const r = await updateMedia(item.id, { name, altText: alt });
              setBusy(false);
              toast(r.ok ? { tone: "positive", headline: "Media saved" } : { tone: "danger", headline: "Save failed", message: r.error });
              router.refresh();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="mx-auto grid max-w-[1200px] gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Box headline="Preview">
            <div className="flex items-center justify-center rounded bg-[repeating-conic-gradient(#f3eded_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-4">
              {item.mediaType === "Image" && item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={alt || name} className="max-h-[480px] max-w-full rounded shadow" />
              ) : (
                <a href={item.url ?? "#"} target="_blank" className="flex flex-col items-center gap-2 py-10 font-bold text-brand-700">
                  <FileIcon className="size-16" /> Open file
                </a>
              )}
            </div>
          </Box>
          <Box headline="Properties">
            <PropertyRow label="Alternative text" description="Describes the image for screen readers and SEO">
              <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
            </PropertyRow>
            <PropertyRow label="URL">
              <div className="flex gap-2">
                <Input readOnly value={absUrl ?? ""} className="font-mono text-xs" />
                <Button
                  look="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(absUrl ?? "");
                    toast({ tone: "positive", headline: "URL copied" });
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </PropertyRow>
          </Box>
        </div>
        <Box headline="Info">
          <dl className="space-y-3 text-sm">
            {[
              ["Type", item.mediaType],
              ["MIME type", item.mimeType ?? "—"],
              ["Size", formatBytes(item.size)],
              ...(item.width ? [["Dimensions", `${item.width} × ${item.height} px`]] : []),
              ["Created", formatDate(item.createdAt)],
              ["Updated", formatDate(item.updatedAt)],
              ["Id", item.id],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-bold">{k}</dt>
                <dd className="break-all text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Box>
      </div>
      {el}
    </Workspace>
  );
}
