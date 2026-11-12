"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Tree, type MenuAction, type TreeItem } from "./Tree";
import { PickTree } from "./DocPicker";
import { Button, Checkbox, Dialog, SidePanel } from "../ui";
import { useToast } from "../toast";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  copyDocument,
  moveDocument,
  publishWithDescendants,
  sortDocuments,
  trashDocument,
  unpublishDocument,
} from "@/actions/content";

export type TreeDocType = {
  id: string;
  name: string;
  alias: string;
  icon: string;
  description: string;
  allowedAtRoot: boolean;
  allowedChildIds: string[];
};
export type TreeDoc = {
  id: string;
  parentId: string | null;
  name: string;
  documentTypeId: string;
  published: boolean;
  edited: boolean;
  sortOrder: number;
};

type Modal =
  | { kind: "create"; parentId: string | null }
  | { kind: "move" | "copy"; doc: TreeDoc }
  | { kind: "sort"; parentId: string | null }
  | { kind: "delete"; doc: TreeDoc }
  | null;

export function ContentTree({
  docs,
  docTypes,
  trashedCount,
  canPublish,
  canDelete,
}: {
  docs: TreeDoc[];
  docTypes: TreeDocType[];
  trashedCount: number;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<Modal>(null);
  const typeById = new Map(docTypes.map((t) => [t.id, t]));
  const activeId = pathname.match(/\/content\/edit\/([^/]+)/)?.[1];

  const items: TreeItem[] = docs.map((d) => ({
    id: d.id,
    parentId: d.parentId,
    name: d.name,
    icon: typeById.get(d.documentTypeId)?.icon ?? "FileText",
    href: `/umbraco/section/content/edit/${d.id}`,
    muted: !d.published,
    edited: d.published && d.edited,
  }));

  const run = async (p: Promise<{ ok: boolean; error?: string }>, success: string) => {
    const r = await p;
    if (r.ok) toast({ tone: "positive", headline: success });
    else toast({ tone: "danger", headline: "Action failed", message: r.error });
    router.refresh();
    return r;
  };

  const itemActions = (item: TreeItem): MenuAction[] => {
    const doc = docs.find((d) => d.id === item.id)!;
    return [
      { label: "Create", icon: "Package", onClick: () => setModal({ kind: "create", parentId: doc.id }) },
      ...(canPublish
        ? [
            { label: "Publish", icon: "Rocket", onClick: () => run(publishWithDescendants(doc.id), `${doc.name} and descendants published`) },
            ...(doc.published
              ? [{ label: "Unpublish", icon: "Shield", onClick: () => run(unpublishDocument(doc.id), `${doc.name} unpublished`) }]
              : []),
          ]
        : []),
      { label: "Move to", icon: "Plane", onClick: () => setModal({ kind: "move", doc }), separatorBefore: true },
      { label: "Copy to", icon: "Images", onClick: () => setModal({ kind: "copy", doc }) },
      { label: "Sort children", icon: "List", onClick: () => setModal({ kind: "sort", parentId: doc.id }) },
      ...(canDelete
        ? [{ label: "Delete", icon: "Skull", danger: true, separatorBefore: true, onClick: () => setModal({ kind: "delete", doc }) }]
        : []),
    ];
  };

  const rootActions: MenuAction[] = [
    { label: "Create", icon: "Package", onClick: () => setModal({ kind: "create", parentId: null }) },
    { label: "Sort children", icon: "List", onClick: () => setModal({ kind: "sort", parentId: null }) },
  ];

  return (
    <>
      <Tree
        items={items}
        activeId={activeId}
        rootLabel="Content"
        rootHref="/umbraco/section/content"
        rootActions={rootActions}
        itemActions={itemActions}
        storageKey="umbk-tree-content"
        footer={
          <Link
            href="/umbraco/section/content/recycle-bin"
            className={cn(
              "mt-1 flex h-9 items-center gap-2 pl-[38px] text-[14px] hover:bg-black/[0.04]",
              pathname.endsWith("/recycle-bin") && "bg-selected font-bold",
            )}
          >
            <Trash2 className="size-[17px] text-brand-800" />
            Recycle Bin
            {trashedCount > 0 && <span className="ml-auto mr-3 text-xs text-muted">{trashedCount}</span>}
          </Link>
        }
      />
      {modal?.kind === "create" && (
        <CreatePanel
          parentId={modal.parentId}
          parentDoc={docs.find((d) => d.id === modal.parentId)}
          docTypes={docTypes}
          onClose={() => setModal(null)}
        />
      )}
      {(modal?.kind === "move" || modal?.kind === "copy") && (
        <MoveCopyPanel
          kind={modal.kind}
          doc={modal.doc}
          docs={docs}
          docTypes={docTypes}
          onClose={() => setModal(null)}
          onDone={async (target, descendants) => {
            const r =
              modal.kind === "move"
                ? await run(moveDocument(modal.doc.id, target), `${modal.doc.name} moved`)
                : await run(copyDocument(modal.doc.id, target, descendants), `${modal.doc.name} copied`);
            if (r.ok) setModal(null);
          }}
        />
      )}
      {modal?.kind === "sort" && (
        <SortPanel
          items={docs.filter((d) => d.parentId === modal.parentId).sort((a, b) => a.sortOrder - b.sortOrder)}
          typeById={typeById}
          onClose={() => setModal(null)}
          onSave={async (ids) => {
            const r = await run(sortDocuments(ids), "Sort order saved");
            if (r.ok) setModal(null);
          }}
        />
      )}
      {modal?.kind === "delete" && (
        <Dialog
          open
          onClose={() => setModal(null)}
          title={`Trash ${modal.doc.name}?`}
          footer={
            <>
              <Button look="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button
                look="danger"
                onClick={async () => {
                  const id = modal.doc.id;
                  setModal(null);
                  await run(trashDocument(id), `${modal.doc.name} moved to the Recycle Bin`);
                  if (activeId === id) router.push("/umbraco/section/content");
                }}
              >
                Trash
              </Button>
            </>
          }
        >
          This will move <b>{modal.doc.name}</b> and all its descendants to the Recycle Bin. They will be unpublished.
        </Dialog>
      )}
    </>
  );
}

function CreatePanel({
  parentId,
  parentDoc,
  docTypes,
  onClose,
}: {
  parentId: string | null;
  parentDoc?: TreeDoc;
  docTypes: TreeDocType[];
  onClose: () => void;
}) {
  const router = useRouter();
  const parentType = parentDoc ? docTypes.find((t) => t.id === parentDoc.documentTypeId) : undefined;
  const allowed = parentId ? docTypes.filter((t) => parentType?.allowedChildIds.includes(t.id)) : docTypes.filter((t) => t.allowedAtRoot);
  return (
    <SidePanel open onClose={onClose} title={`Create ${parentDoc ? `under ${parentDoc.name}` : "at root"}`} width={460}>
      {allowed.length === 0 ? (
        <div className="rounded-[6px] bg-white p-5 text-sm">
          <p className="font-bold">There are no allowed Document Types available for creating content here.</p>
          <p className="mt-2 text-muted">
            You must enable these in the{" "}
            <Link className="text-brand-700 underline" href={parentType ? `/umbraco/section/settings/document-types/${parentType.id}` : "/umbraco/section/settings"} onClick={onClose}>
              Document Types
            </Link>{" "}
            settings, under <b>Structure</b> ({parentId ? "Allowed child node types" : "Allow at root"}).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allowed.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onClose();
                router.push(`/umbraco/section/content/create?type=${t.id}${parentId ? `&parent=${parentId}` : ""}`);
              }}
              className="flex w-full items-center gap-4 rounded-[6px] bg-white p-4 text-left shadow-sm hover:ring-2 hover:ring-brand-300"
            >
              <div className="flex size-10 items-center justify-center rounded bg-brand-50 text-brand-700">
                <Icon name={t.icon} className="size-5" />
              </div>
              <div>
                <div className="font-bold">{t.name}</div>
                {t.description && <div className="text-sm text-muted">{t.description}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </SidePanel>
  );
}

function MoveCopyPanel({
  kind,
  doc,
  docs,
  docTypes,
  onClose,
  onDone,
}: {
  kind: "move" | "copy";
  doc: TreeDoc;
  docs: TreeDoc[];
  docTypes: TreeDocType[];
  onClose: () => void;
  onDone: (target: string | null, descendants: boolean) => Promise<void>;
}) {
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const [descendants, setDescendants] = useState(true);
  const [busy, setBusy] = useState(false);
  const typeById = new Map(docTypes.map((t) => [t.id, t]));
  // prevent choosing self/descendants for move
  const blocked = new Set<string>();
  if (kind === "move") {
    const stack = [doc.id];
    while (stack.length) {
      const c = stack.pop()!;
      blocked.add(c);
      docs.filter((d) => d.parentId === c).forEach((d) => stack.push(d.id));
    }
  }
  const allowedHere = (parentTypeId?: string) =>
    parentTypeId ? typeById.get(parentTypeId)?.allowedChildIds.includes(doc.documentTypeId) : typeById.get(doc.documentTypeId)?.allowedAtRoot;

  return (
    <SidePanel
      open
      onClose={onClose}
      title={`${kind === "move" ? "Move" : "Copy"} ${doc.name}`}
      footer={
        <>
          <Button look="ghost" onClick={onClose}>Close</Button>
          <Button
            look="primary"
            disabled={target === undefined}
            busy={busy}
            onClick={async () => {
              setBusy(true);
              await onDone(target ?? null, descendants);
              setBusy(false);
            }}
          >
            {kind === "move" ? "Move" : "Copy"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">Choose where to {kind} <b className="text-ink">{doc.name}</b> to in the tree structure below.</p>
      <PickTree
        rootOption="Content (root)"
        nodes={docs.map((d) => ({
          id: d.id,
          parentId: d.parentId,
          name: d.name,
          icon: typeById.get(d.documentTypeId)?.icon ?? "FileText",
          disabled: blocked.has(d.id) || !allowedHere(d.documentTypeId),
          muted: !d.published,
        }))}
        selected={target === undefined ? [] : [target ?? "$root"]}
        onSelect={(id) => {
          if (id === null && !allowedHere()) return;
          setTarget(id);
        }}
      />
      {kind === "copy" && (
        <div className="mt-4">
          <Checkbox checked={descendants} onChange={setDescendants} label="Include descendants" />
        </div>
      )}
    </SidePanel>
  );
}

function SortPanel({
  items,
  typeById,
  onClose,
  onSave,
}: {
  items: TreeDoc[];
  typeById: Map<string, TreeDocType>;
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [order, setOrder] = useState(items);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const n = [...order];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x!);
    setOrder(n);
  };
  return (
    <SidePanel
      open
      onClose={onClose}
      title="Sort children"
      footer={
        <>
          <Button look="ghost" onClick={onClose}>Close</Button>
          <Button look="primary" busy={busy} onClick={async () => { setBusy(true); await onSave(order.map((o) => o.id)); setBusy(false); }}>
            Save
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">Drag the items or use the arrows to change their order.</p>
      <div className="overflow-hidden rounded-[6px] bg-white">
        {order.map((d, i) => (
          <div
            key={d.id}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => {
              e.preventDefault();
              if (drag !== null && drag !== i) {
                move(drag, i);
                setDrag(i);
              }
            }}
            onDragEnd={() => setDrag(null)}
            className={cn("flex cursor-grab items-center gap-3 border-b border-line px-4 py-2.5 last:border-0", drag === i && "bg-selected")}
          >
            <Icon name={typeById.get(d.documentTypeId)?.icon ?? "FileText"} className="size-4 text-brand-800" />
            <span className="flex-1">{d.name}</span>
            <button onClick={() => move(i, i - 1)} className="rounded p-1 hover:bg-black/5" aria-label="Up"><ArrowUp className="size-4" /></button>
            <button onClick={() => move(i, i + 1)} className="rounded p-1 hover:bg-black/5" aria-label="Down"><ArrowDown className="size-4" /></button>
          </div>
        ))}
        {!order.length && <div className="p-6 text-center text-sm text-muted">No children to sort</div>}
      </div>
    </SidePanel>
  );
}
