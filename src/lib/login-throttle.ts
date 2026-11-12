/**
 * Simple in-memory brute-force protection for the backoffice login.
 * Failures are counted per email and per client IP; after MAX_FAILURES within
 * WINDOW_MS the key is locked for LOCK_MS. (Per server process — good enough for a
 * single-instance CMS; use Redis or the database if you run several instances.)
 */

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

type Entry = { failures: number; first: number; lockedUntil: number };
const entries = new Map<string, Entry>();

function prune(now: number) {
  if (entries.size < 5000) return;
  for (const [k, e] of entries) if (e.lockedUntil < now && now - e.first > WINDOW_MS) entries.delete(k);
}

/** Milliseconds until any of the keys is unlocked, or 0 when login may be attempted. */
export function lockedFor(keys: string[], now = Date.now()) {
  return Math.max(0, ...keys.map((k) => (entries.get(k)?.lockedUntil ?? 0) - now));
}

export function recordFailure(keys: string[], now = Date.now()) {
  prune(now);
  for (const k of keys) {
    let e = entries.get(k);
    if (!e || now - e.first > WINDOW_MS) e = { failures: 0, first: now, lockedUntil: 0 };
    e.failures++;
    if (e.failures >= MAX_FAILURES) {
      e.lockedUntil = now + LOCK_MS;
      e.failures = 0;
      e.first = now;
    }
    entries.set(k, e);
  }
}

export function recordSuccess(keys: string[]) {
  for (const k of keys) entries.delete(k);
}
