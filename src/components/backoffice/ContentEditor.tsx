"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, ExternalLink, History, RotateCcw } from "lucide-react";
import { Workspace, NameInput } from "./Workspace";
import { ActionMenu } from "./Tree";
import { Box, Button, Dialog, PropertyRow, Tag } from "../ui";
import { PropertyEditor } from "../editors/PropertyEditor";
import { useToast } from "../toast";
import { saveDocument, unpublishDocument, rollbackDocument, publishWithDescendants } from "@/actions/content";
import type { DocTypeSchema } from "@/lib/content-schema";
import { formatDate, type JsonObject } from "@/lib/utils";

export interface ContentEditorProps {
  mode: "create" | "edit";
  parentId: string | null;
  schema: DocTypeSchema;
  breadcrumbs: { name: string; href?: string }[];
  canPublish: boolean;
  doc?: {
    id: string;
    name: string;
    values: JsonObject;
    published: boolean;
    edited: boolean;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    createdBy: string;
    updatedBy: string;
    url: string | null;
  };
  versions?: { id: string; name: string; createdAt: string; published: boolean; user: string }[];
  history?: { id: string; action: string; comment: string; createdAt: string; user: string }[];
}

export function ContentEditor(props: ContentEditorProps) {
  const { mode, schema, doc, canPublish } = props;
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState("content");
  const [name, setName] = useState(doc?.name ?? "");
  const [values, setValues] = useState<JsonObject>(doc?.values ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [rollback, setRollback] = useState<{ id: string; createdAt: string } | null>(null);
  const saveRef = useRef<(publish: boolean) => void>(() => {});

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = useCallback(
    async (publish: boolean) => {
      setBusy(publish ? "publish" : "save");
      const r = await saveDocument({
        id: doc?.id,
        parentId: props.parentId,
        documentTypeId: schema.id,
        name,
        values,
        publish,
      });
      setBusy(null);
      setErrors(r.errors ?? {});
      if (!r.ok) {
        toast({ tone: "danger", headline: publish ? "Publishing failed" : "Save failed", message: r.error });
        setView("content");
        return;
      }
      setDirty(false);
      toast({
        tone: "positive",
        headline: publish ? "Document published" : "Document saved",
        message: publish ? `${name} is now live` : r.errors ? "Saved, but some properties are invalid and must be fixed before publishing" : undefined,
      });
      if (mode === "create" && r.id) router.replace(`/umbraco/section/content/edit/${r.id}`);
      else router.refresh();
    },
    [doc?.id, props.parentId, schema.id, name, values, mode, router, toast],
  );
  saveRef.current = save;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const set = (alias: string, v: unknown) => {
    setValues((s) => ({ ...s, [alias]: v }));
    setDirty(true);
    if (errors[alias]) setErrors(({ [alias]: _, ...rest }) => rest);
  };

  const status = !doc ? null : doc.published ? (doc.edited ? "pending" : "published") : "draft";

  return (
    <>
      <Workspace
        icon={schema.icon}
        name={
          <NameInput
            value={name}
            invalid={!!errors.$name}
            onChange={(v) => {
              setName(v);
              setDirty(true);
            }}
            aliasSlot={
              status && (
                <Tag tone={status === "published" ? "positive" : status === "pending" ? "warning" : "default"}>
                  {status === "published" ? "Published" : status === "pending" ? "Pending changes" : "Draft"}
                </Tag>
              )
            }
          />
        }
        tabs={[
          { key: "content", label: "Content", icon: "FileText", invalid: Object.keys(errors).length > 0 },
          ...(doc ? [{ key: "info", label: "Info", icon: "Lightbulb" }] : []),
        ]}
        activeTab={view}
        onTab={setView}
        breadcrumbs={[...props.breadcrumbs, { name: name || "Untitled" }]}
        actions={
          <>
            {doc?.url && doc.published && (
              <a href={doc.url} target="_blank">
                <Button look="ghost"><ExternalLink className="size-4" /> View</Button>
              </a>
            )}
            <Button look="secondary" busy={busy === "save"} onClick={() => save(false)}>
              Save
            </Button>
            {canPublish && (
              <div className="flex">
                <Button look="positive" className="rounded-r-none" busy={busy === "publish"} onClick={() => save(true)}>
                  Save and publish
                </Button>
                <Button
                  look="positive"
                  className="rounded-l-none border-l border-white/25 px-2"
                  disabled={!doc}
                  onClick={(e) => setMenu({ x: e.clientX - 200, y: e.clientY - 110 })}
                  aria-label="More publishing options"
                >
                  <ChevronUp className="size-4" />
                </Button>
              </div>
            )}
          </>
        }
      >
        {view === "content" ? (
          <div className="mx-auto max-w-[1200px] space-y-5">
            {schema.groups.length === 0 && (
              <Box>
                <p className="text-sm text-muted">
                  This Document Type has no properties yet. Add some under{" "}
                  <Link className="text-brand-700 underline" href={`/umbraco/section/settings/document-types/${schema.id}`}>
                    Settings › Document Types › {schema.name}
                  </Link>
                  .
                </p>
              </Box>
            )}
            {schema.groups.map((g) => (
              <Box key={g.id} headline={g.name}>
                {g.properties.map((p) => (
                  <PropertyRow key={p.id} label={p.name} description={p.description} mandatory={p.mandatory} error={errors[p.alias]}>
                    <PropertyEditor
                      editorAlias={p.editorAlias}
                      config={p.config}
                      value={values[p.alias]}
                      onChange={(v) => set(p.alias, v)}
                      invalid={!!errors[p.alias]}
                    />
                  </PropertyRow>
                ))}
              </Box>
            ))}
          </div>
        ) : (
          doc && <InfoView doc={doc} schema={schema} versions={props.versions ?? []} history={props.history ?? []} onRollback={setRollback} />
        )}
      </Workspace>
      {menu && doc && (
        <ActionMenu
          anchor={menu}
          onClose={() => setMenu(null)}
          actions={[
            {
              label: "Publish with descendants",
              icon: "Rocket",
              onClick: async () => {
                const r = await publishWithDescendants(doc.id);
                toast(r.ok ? { tone: "positive", headline: `${r.count} item(s) published` } : { tone: "danger", headline: "Some items were not published", message: r.error });
                router.refresh();
              },
            },
            ...(doc.published
              ? [
                  {
                    label: "Unpublish",
                    icon: "Shield",
                    onClick: async () => {
                      await unpublishDocument(doc.id);
                      toast({ tone: "positive", headline: "Document unpublished" });
                      router.refresh();
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
      <Dialog
        open={!!rollback}
        onClose={() => setRollback(null)}
        title="Rollback"
        footer={
          <>
            <Button look="ghost" onClick={() => setRollback(null)}>Cancel</Button>
            <Button
              look="primary"
              onClick={async () => {
                if (!doc || !rollback) return;
                await rollbackDocument(doc.id, rollback.id);
                setRollback(null);
                toast({ tone: "positive", headline: "Rolled back", message: "The draft now contains the selected version. Publish to make it live." });
                window.location.reload();
              }}
            >
              Rollback
            </Button>
          </>
        }
      >
        Replace the current draft with the version from <b>{rollback && formatDate(rollback.createdAt)}</b>?
      </Dialog>
    </>
  );
}

function InfoView({
  doc,
  schema,
  versions,
  history,
  onRollback,
}: {
  doc: NonNullable<ContentEditorProps["doc"]>;
  schema: DocTypeSchema;
  versions: NonNullable<ContentEditorProps["versions"]>;
  history: NonNullable<ContentEditorProps["history"]>;
  onRollback: (v: { id: string; createdAt: string }) => void;
}) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Box headline="Links">
          {doc.url && doc.published ? (
            <a href={doc.url} target="_blank" className="flex items-center gap-2 font-bold text-brand-700 hover:underline">
              {doc.url} <ExternalLink className="size-4" />
            </a>
          ) : (
            <p className="text-sm text-muted">This document is not published, or one of its ancestors is unpublished.</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Delivery API:{" "}
            <a className="font-mono text-brand-700 hover:underline" target="_blank" href={`/api/delivery/v2/content/item/${doc.id}`}>
              /api/delivery/v2/content/item/{doc.id}
            </a>
          </p>
        </Box>
        <Box headline="History">
          <ol className="relative space-y-4 border-l-2 border-line pl-5">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute top-1 -left-[27px] size-3 rounded-full border-2 border-white bg-brand-600" />
                <div className="flex items-center gap-2 text-sm">
                  <b>{h.user}</b>
                  <Tag tone={h.action === "Publish" ? "positive" : "default"}>{h.action}</Tag>
                  <span className="text-xs text-muted">{formatDate(h.createdAt)}</span>
                </div>
                {h.comment && <div className="mt-0.5 text-sm text-muted">{h.comment}</div>}
              </li>
            ))}
          </ol>
        </Box>
        <Box headline={<span className="flex items-center gap-2"><History className="size-4" /> Versions</span>}>
          <table className="w-full text-sm">
            <tbody>
              {versions.map((v, i) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="py-2">{formatDate(v.createdAt)}</td>
                  <td className="py-2 text-muted">{v.user}</td>
                  <td className="py-2">{v.published && <Tag tone="positive">Published</Tag>}{i === 0 && <span className="ml-1"><Tag>Current</Tag></span>}</td>
                  <td className="py-2 text-right">
                    {i > 0 && (
                      <Button compact look="outline" onClick={() => onRollback(v)}>
                        <RotateCcw className="size-3.5" /> Rollback
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </div>
      <Box headline="General">
        <dl className="space-y-3 text-sm">
          {[
            ["Status", doc.published ? (doc.edited ? "Published (pending changes)" : "Published") : "Draft"],
            ["Created", `${formatDate(doc.createdAt)} by ${doc.createdBy}`],
            ["Last edited", `${formatDate(doc.updatedAt)} by ${doc.updatedBy}`],
            ["Last published", formatDate(doc.publishedAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-bold">{k}</dt>
              <dd className="text-muted">{v}</dd>
            </div>
          ))}
          <div>
            <dt className="font-bold">Document Type</dt>
            <dd>
              <Link className="text-brand-700 hover:underline" href={`/umbraco/section/settings/document-types/${schema.id}`}>
                {schema.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-bold">Id</dt>
            <dd className="font-mono text-xs break-all text-muted">{doc.id}</dd>
          </div>
        </dl>
      </Box>
    </div>
  );
}
