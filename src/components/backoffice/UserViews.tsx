"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Workspace, NameInput } from "./Workspace";
import { Tree } from "./Tree";
import { Box, Button, Dialog, Input, PasswordInput, PropertyRow, Select, Toggle, Tag } from "../ui";
import { useToast } from "../toast";
import { deleteUser, saveUser } from "@/actions/users";
import { formatDate, initials } from "@/lib/utils";

export const ROLE_INFO: Record<string, { label: string; text: string }> = {
  admin: { label: "Administrators", text: "Full access to all sections, including Settings and Users." },
  editor: { label: "Editors", text: "Can create, edit, publish and delete content and media." },
  writer: { label: "Writers", text: "Can create and save content, but cannot publish it." },
};

export function UsersTree() {
  const pathname = usePathname();
  const activeId = pathname.endsWith("/groups") ? "groups" : "users";
  return (
    <Tree
      items={[
        { id: "users", parentId: null, name: "Users", icon: "Users", href: "/umbraco/section/users" },
        { id: "groups", parentId: null, name: "User Groups", icon: "Shield", href: "/umbraco/section/users/groups" },
      ]}
      activeId={activeId}
      rootLabel="Users"
      rootHref="/umbraco/section/users"
      storageKey="umbk-tree-users"
    />
  );
}

export function UserEditor({
  user,
  isSelf,
}: {
  user?: { id: string; name: string; email: string; role: string; disabled: boolean; lastLoginAt: string | null; createdAt: string };
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "editor");
  const [disabled, setDisabled] = useState(user?.disabled ?? false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setBusy(true);
    const r = await saveUser({ id: user?.id, name, email, role, disabled, password: password || undefined });
    setBusy(false);
    if (!r.ok) return toast({ tone: "danger", headline: "Save failed", message: r.error });
    setPassword("");
    toast({ tone: "positive", headline: "User saved" });
    if (!user) router.replace(`/umbraco/section/users/${r.id}`);
    else router.refresh();
  };

  return (
    <Workspace
      icon="User"
      backHref="/umbraco/section/users"
      name={<NameInput value={name} onChange={setName} placeholder="Enter the user's name..." />}
      breadcrumbs={[{ name: "Users", href: "/umbraco/section/users" }, { name: name || "New user" }]}
      actions={
        <>
          {user && !isSelf && (
            <Button look="ghost" className="text-brand-700" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button look="positive" busy={busy} onClick={save}>
            {user ? "Save" : "Create user"}
          </Button>
        </>
      }
    >
      <div className="mx-auto grid max-w-[1100px] gap-5 lg:grid-cols-[1fr_320px]">
        <Box headline="Profile">
          <PropertyRow label="Email" mandatory>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </PropertyRow>
          <PropertyRow label="User group" description={ROLE_INFO[role]?.text}>
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="max-w-xs" disabled={isSelf}>
              {Object.entries(ROLE_INFO).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label={user ? "Reset password" : "Password"} mandatory={!user} description="At least 10 characters">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </PropertyRow>
          <PropertyRow label="Disabled" description="Disabled users cannot log in.">
            <Toggle checked={disabled} onChange={setDisabled} disabled={isSelf} />
          </PropertyRow>
        </Box>
        <Box>
          <div className="flex flex-col items-center text-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-brand-600 text-3xl font-bold text-white">
              {initials(name || "?")}
            </div>
            <div className="mt-3 font-bold">{name || "New user"}</div>
            <div className="text-sm text-muted">{email}</div>
            <div className="mt-2">{disabled ? <Tag tone="danger">Disabled</Tag> : <Tag tone="positive">Active</Tag>}</div>
          </div>
          {user && (
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div><dt className="font-bold">Last login</dt><dd className="text-muted">{formatDate(user.lastLoginAt)}</dd></div>
              <div><dt className="font-bold">Created</dt><dd className="text-muted">{formatDate(user.createdAt)}</dd></div>
            </dl>
          )}
        </Box>
      </div>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${user?.name}?`}
        footer={
          <>
            <Button look="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              look="danger"
              onClick={async () => {
                const r = await deleteUser(user!.id);
                setConfirmDelete(false);
                if (!r.ok) return toast({ tone: "danger", headline: "Delete failed", message: r.error });
                toast({ tone: "positive", headline: "User deleted" });
                router.push("/umbraco/section/users");
                router.refresh();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        The user will be removed permanently. Their history entries will be kept.
      </Dialog>
    </Workspace>
  );
}

export function UserCard({ u }: { u: { id: string; name: string; email: string; role: string; disabled: boolean; lastLoginAt: string | null } }) {
  return (
    <Link
      href={`/umbraco/section/users/${u.id}`}
      className="flex flex-col items-center rounded-[6px] bg-white p-6 text-center shadow-[0_1px_1px_rgba(0,0,0,0.12)] hover:ring-2 hover:ring-brand-300"
    >
      <div className={`flex size-16 items-center justify-center rounded-full text-xl font-bold text-white ${u.disabled ? "bg-muted" : "bg-brand-600"}`}>
        {initials(u.name)}
      </div>
      <div className="mt-3 font-bold">{u.name}</div>
      <div className="text-sm text-muted">{u.email}</div>
      <div className="mt-2 flex gap-1">
        <Tag>{ROLE_INFO[u.role]?.label ?? u.role}</Tag>
        {u.disabled && <Tag tone="danger">Disabled</Tag>}
      </div>
      <div className="mt-3 text-xs text-muted">Last login: {formatDate(u.lastLoginAt)}</div>
    </Link>
  );
}
