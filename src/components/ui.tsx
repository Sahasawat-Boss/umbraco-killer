"use client";

import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Look = "primary" | "positive" | "secondary" | "outline" | "ghost" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { look?: Look; busy?: boolean; compact?: boolean }
>(function Button({ look = "secondary", busy, compact, className, children, disabled, ...rest }, ref) {
  const styles: Record<Look, string> = {
    primary: "bg-brand-700 text-white hover:bg-brand-800",
    positive: "bg-positive text-white hover:bg-positive-hover",
    secondary: "bg-[#efe8e8] text-ink hover:bg-[#e5dada]",
    outline: "border border-line bg-white text-ink hover:border-brand-400 hover:text-brand-700",
    ghost: "text-ink hover:bg-black/5",
    danger: "bg-[#8b1d1d] text-white hover:bg-[#6d1414]",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1.5 rounded-[3px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        compact ? "h-8 px-3 text-sm" : "h-9 px-4 text-[14px]",
        styles[look],
        className,
      )}
      {...rest}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

const fieldBase =
  "w-full rounded-[3px] border border-line bg-white px-2.5 text-[14px] text-ink placeholder:text-muted/70 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-surface";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-9", invalid && "border-brand-600 bg-brand-50", className)} {...rest} />;
  },
);

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn(fieldBase, "py-2 leading-relaxed", invalid && "border-brand-600 bg-brand-50", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-9 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2.5 select-none", disabled ? "opacity-60" : "cursor-pointer")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "focus-ring relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-[#d6cccc]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm select-none">
      <input
        type="checkbox"
        className="size-4 accent-brand-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/** Umbraco's uui-box: white card with a headline */
export function Box({
  headline,
  actions,
  children,
  className,
}: {
  headline?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[6px] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.12)]", className)}>
      {headline && (
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="font-bold">{headline}</h3>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Property layout: label/description on the left, editor on the right */
export function PropertyRow({
  label,
  description,
  mandatory,
  error,
  alias,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  mandatory?: boolean;
  error?: string;
  alias?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-x-6 gap-y-2 border-b border-line/70 py-4 last:border-0 first:pt-0 last:pb-0 md:grid-cols-[minmax(180px,260px)_1fr]">
      <div>
        <div className="font-bold text-[14px]">
          {label}
          {mandatory && <span className="ml-0.5 text-brand-600">*</span>}
        </div>
        {alias && <div className="text-xs text-muted font-mono mt-0.5">{alias}</div>}
        {description && <div className="text-[13px] text-muted mt-1 leading-snug">{description}</div>}
      </div>
      <div className="min-w-0">
        {children}
        {error && <div className="mt-1.5 text-[13px] font-bold text-brand-700">{error}</div>}
      </div>
    </div>
  );
}

/** Umbraco's sidebar modal — slides in from the right */
export function SidePanel({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade-in absolute inset-0 bg-[#1f0a0c]/40" onClick={onClose} />
      <aside
        className="animate-slide-in-right relative flex h-full flex-col bg-surface shadow-2xl"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-line bg-white px-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="focus-ring rounded p-1 hover:bg-black/5" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex shrink-0 justify-end gap-2 border-t border-line bg-white p-3">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-[#1f0a0c]/40" onClick={onClose} />
      <div className="animate-toast-in relative w-full max-w-md rounded-[6px] bg-white shadow-2xl">
        <div className="p-6">
          <h2 className="mb-3 text-lg font-bold">{title}</h2>
          <div className="text-[14px]">{children}</div>
        </div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

function useEsc(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && fn();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, fn]);
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "positive" | "warning" | "danger" }) {
  const tones = {
    default: "bg-[#efe8e8] text-ink",
    positive: "bg-brand-600 text-white",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-[#8b1d1d] text-white",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold", tones[tone])}>{children}</span>;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
      {icon && <div className="mb-3 text-brand-300">{icon}</div>}
      <div className="text-lg font-bold text-ink">{title}</div>
      {children && <div className="mt-1 max-w-md text-sm">{children}</div>}
    </div>
  );
}
