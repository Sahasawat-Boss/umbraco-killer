import pkg from "../../package.json";

export const VERSION = pkg.version;

/** What "LTS" stands for this time. A different one is picked on every page load. */
export const LTS_MEANINGS = [
  "Long Term Suffering",
  "Licensed To Slay (Umbraco)",
  "Lethal To Sites built in Umbraco",
  "Last Time Supported: never",
  "Let The Site burn 🔥",
  "Lots of Tiny Shortcuts",
  "Looks Totally Stable",
  "Literally Typed by Sleepless devs",
  "Logs To Stdout",
  "Long Term Spite",
] as const;
