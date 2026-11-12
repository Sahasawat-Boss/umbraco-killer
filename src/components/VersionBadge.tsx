"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LTS_MEANINGS, VERSION } from "@/lib/version";

const pick = (not?: string) => {
  const pool = LTS_MEANINGS.filter((m) => m !== not);
  return pool[Math.floor(Math.random() * pool.length)];
};

/** "v0.1.0 LTS" badge. Hover to see what LTS means today; click for another meaning. */
export function VersionBadge({ className }: { className?: string }) {
  // Start with a fixed value so server and client render the same HTML, then randomise after mount.
  const [meaning, setMeaning] = useState<string>(LTS_MEANINGS[0]);
  useEffect(() => setMeaning(pick()), []);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMeaning((m) => pick(m));
      }}
      aria-label={`Version ${VERSION} LTS: ${meaning}`}
      className={cn(
        "group relative inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none whitespace-nowrap",
        className,
      )}
    >
      v{VERSION} LTS
      <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 hidden -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-[11px] font-normal text-white shadow-lg group-hover:block">
        LTS = {meaning}
      </span>
    </button>
  );
}
