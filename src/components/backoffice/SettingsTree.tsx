"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Tree, type MenuAction, type TreeItem } from "./Tree";
import { Button, Dialog } from "../ui";
import { useToast } from "../toast";
import { deleteDataType, deleteDocumentType } from "@/actions/settings";

export function SettingsTree({
  docTypes,
  dataTypes,
}: {
  docTypes: { id: string; name: string; icon: string }[];
  dataTypes: { id: string; name: string; icon: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ kind: "doc" | "data"; id: string; name: string } | null>(null);
  const activeId =
    pathname.match(/\/(?:document-types|data-types)\/([^/]+)/)?.[1] ??
    (pathname.endsWith("/document-types") ? "$doctypes" : pathname.endsWith("/data-types") ? "$datatypes" : undefined);

  const items: TreeItem[] = [
    { id: "$doctypes", parentId: null, name: "Document Types", icon: "LayoutTemplate", href: "/umbraco/section/settings/document-types" },
    ...docTypes.map((d) => ({ id: d.id, parentId: "$doctypes", name: d.name, icon: d.icon, href: `/umbraco/section/settings/document-types/${d.id}` })),
    { id: "$datatypes", parentId: null, name: "Data Types", icon: "Database", href: "/umbraco/section/settings/data-types" },
    ...dataTypes.map((d) => ({ id: d.id, parentId: "$datatypes", name: d.name, icon: d.icon, href: `/umbraco/section/settings/data-types/${d.id}` })),
  ];

  const actions = (item: TreeItem): MenuAction[] => {
    if (item.id === "$doctypes")
      return [{ label: "Create Document Type", icon: "Package", onClick: () => router.push("/umbraco/section/settings/document-types/new") }];
    if (item.id === "$datatypes")
      return [{ label: "Create Data Type", icon: "Package", onClick: () => router.push("/umbraco/section/settings/data-types/new") }];
    const kind = item.parentId === "$doctypes" ? "doc" : "data";
    return [{ label: "Delete", icon: "Skull", danger: true, onClick: () => setConfirm({ kind, id: item.id, name: item.name }) }];
  };

  return (
    <>
      <Tree
        items={items}
        activeId={activeId}
        rootLabel="Settings"
        rootHref="/umbraco/section/settings"
        itemActions={actions}
        storageKey="umbk-tree-settings"
      />
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`Delete ${confirm?.name}?`}
        footer={
          <>
            <Button look="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              look="danger"
              onClick={async () => {
                const c = confirm!;
                setConfirm(null);
                const r = c.kind === "doc" ? await deleteDocumentType(c.id) : await deleteDataType(c.id);
                if (!r.ok) return toast({ tone: "danger", headline: "Delete failed", message: r.error });
                toast({ tone: "positive", headline: `${c.name} deleted` });
                if (pathname.includes(c.id)) router.push("/umbraco/section/settings");
                router.refresh();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        This cannot be undone.
      </Dialog>
    </>
  );
}
