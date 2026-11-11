"use client";

import { useActionState, useState } from "react";
import { loginAction, installAction } from "@/actions/auth";
import { Button, Input, Checkbox } from "./ui";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && <p className="text-sm font-bold text-brand-700">{state.error}</p>}
      <Button look="positive" type="submit" busy={pending} className="w-full h-11">
        Login
      </Button>
    </form>
  );
}

export function InstallForm() {
  const [state, action, pending] = useActionState(installAction, undefined);
  const [starter, setStarter] = useState(true);
  return (
    <form action={action} className="space-y-4">
      <Field label="Name">
        <Input name="name" required autoFocus />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" minLength={10} required />
        <span className="mt-1 block text-xs text-muted">At least 10 characters</span>
      </Field>
      <input type="hidden" name="starterKit" value={starter ? "on" : ""} />
      <Checkbox checked={starter} onChange={setStarter} label="Install starter kit (sample Document Types & content)" />
      {state?.error && <p className="text-sm font-bold text-brand-700">{state.error}</p>}
      <Button look="positive" type="submit" busy={pending} className="w-full h-11">
        Install
      </Button>
    </form>
  );
}
