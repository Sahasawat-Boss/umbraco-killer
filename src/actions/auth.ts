"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { lockedFor, recordFailure, recordSuccess } from "@/lib/login-throttle";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { isInstalled, runInstall } from "@/lib/install";
import { audit } from "@/lib/audit";

export type FormState = { error?: string } | undefined;

// Compared against when the email doesn't exist, so response time doesn't reveal valid accounts
const DUMMY_HASH = bcrypt.hashSync("umb-killer-timing-dummy", 10);

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const keys = [`email:${email}`, `ip:${await clientIp()}`];
  const wait = lockedFor(keys);
  if (wait > 0) {
    return { error: `Too many failed login attempts. Try again in ${Math.ceil(wait / 60000)} minute(s).` };
  }
  const user = await db.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || user.disabled || !passwordOk) {
    recordFailure(keys);
    if (user) await audit("User", user.id, "LoginFailed", null);
    return { error: "Login failed for this email and password combination." };
  }
  recordSuccess(keys);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit("User", user.id, "Login", user.id);
  await createSession(user.id);
  redirect("/umbraco/section/content");
}

export async function logoutAction() {
  await destroySession();
  redirect("/umbraco/login");
}

export async function installAction(_: FormState, form: FormData): Promise<FormState> {
  if (await isInstalled()) return { error: "umb-killer is already installed." };
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a name and a valid email." };
  if (password.length < 10) return { error: "The password must be at least 10 characters long." };
  const admin = await runInstall({ name, email, password, starterKit: form.get("starterKit") === "on" });
  await createSession(admin.id);
  redirect("/umbraco/section/content");
}
