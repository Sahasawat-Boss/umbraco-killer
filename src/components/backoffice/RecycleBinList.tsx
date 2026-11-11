"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Box, Button, Dialog, EmptyState } from "../ui";
import { useToast } from "../toast";
import { Icon } from "@/lib/icons";
import { formatDate } from "@/lib/utils";
import { deleteDocument, emptyRecycleBin, restoreDocument } from "@/actions/content";
import { deleteMedia, emptyMediaRecycleBin, restoreMedia } from "@/actions/media";

type Item = { id: string; name: string; icon: string; type: string; deletedAt: string; children: number };

export function RecycleBinList({ kind, items }: { kind: "content" | "media"; items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ id?: string; name: string } | null>(null);
  const api =
    kind === "content"
      ? { restore: restoreDocument, del: deleteDocument, empty: emptyRecycleBin }
      : { restore: restoreMedia, del: deleteMedia, empty: emptyMediaRecycleBin };

  if (!items.length)
    return (
      <EmptyState icon={<Trash2 className="size-14" />} title="The Recycle Bin is empty">
        Deleted items end up here so you can restore them later.
      </EmptyState>
    );

  return (
    <div className="mx-auto max-w-5xl">
      <Box
        headline={`${items.length} item(s) in the Recycle Bin`}
        actions={
          <Button look="danger" compact onClick={() => setConfirm({ name: "everything in the Recycle Bin" })}>
            <Trash2 className="size-4" /> Empty Recycle Bin
          </Button>
        }
      >
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-xs tracking-wide text-muted uppercase">
              <th className="pb-2">Name</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Deleted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="py-2.5">
                  <span className="flex items-center gap-2 font-bold">
                    <Icon name={i.icon} className="size-4 text-brand-800" /> {i.name}
                    {i.children > 0 && <span className="text-xs font-normal text-muted">+{i.children} children</span>}
                  </span>
                </td>
                <td className="text-muted">{i.type}</td>
                <td className="text-muted">{formatDate(i.deletedAt)}</td>
                <td className="space-x-2 py-2 text-right">
                  <Button
                    compact
                    look="outline"
                    onClick={async () => {
                      await api.restore(i.id);
                      toast({ tone: "positive", headline: `${i.name} restored` });
                      router.refresh();
                    }}
                  >
                    <RotateCcw className="size-3.5" /> Restore
                  </Button>
                  <Button compact look="ghost" className="text-brand-700" onClick={() => setConfirm({ id: i.id, name: i.name })}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete permanently?"
        footer={
          <>
            <Button look="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              look="danger"
              onClick={async () => {
                const c = confirm!;
                setConfirm(null);
                const r = c.id ? await api.del(c.id) : await api.empty();
                toast(r.ok ? { tone: "positive", headline: "Deleted permanently" } : { tone: "danger", headline: "Delete failed", message: r.error });
                router.refresh();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <b>{confirm?.name}</b> will be deleted permanently. This cannot be undone.
      </Dialog>
    </div>
  );
}
