"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { SaveResult } from "./content";

const ROLES = ["admin", "editor", "writer"];

export async function saveUser(input: {
  id?: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  password?: string;
}): Promise<SaveResult> {
  const me = await requireAdmin();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Name and a valid email are required" };
  if (!ROLES.includes(input.role)) return { ok: false, error: "Invalid user group" };
  if (!input.id && (!input.password || input.password.length < 10)) {
    return { ok: false, error: "Password must be at least 10 characters" };
  }
  if (input.password && input.password.length < 10) return { ok: false, error: "Password must be at least 10 characters" };
  if (input.id === me.id && (input.disabled || input.role !== "admin")) {
    return { ok: false, error: "You cannot disable or demote yourself" };
  }
  const clash = await db.user.findFirst({ where: { email, ...(input.id ? { NOT: { id: input.id } } : {}) } });
  if (clash) return { ok: false, error: "A user with this email already exists" };

  const data = {
    name,
    email,
    role: input.role,
    disabled: input.disabled,
    ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 10) } : {}),
  };
  const u = input.id
    ? await db.user.update({ where: { id: input.id }, data })
    : await db.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
  await audit("User", u.id, input.id ? "Save" : "Create", me.id);
  revalidatePath("/umbraco", "layout");
  return { ok: true, id: u.id };
}

export async function deleteUser(id: string): Promise<SaveResult> {
  const me = await requireAdmin();
  if (id === me.id) return { ok: false, error: "You cannot delete yourself" };
  await db.user.delete({ where: { id } });
  await audit("User", id, "Delete", me.id);
  revalidatePath("/umbraco", "layout");
  return { ok: true };
}

export async function changeOwnPassword(current: string, next: string): Promise<SaveResult> {
  const me = await requireUser();
  if (!(await bcrypt.compare(current, me.passwordHash))) return { ok: false, error: "Current password is incorrect" };
  if (next.length < 10) return { ok: false, error: "Password must be at least 10 characters" };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  await audit("User", me.id, "Save", me.id, "Changed password");
  return { ok: true };
}
