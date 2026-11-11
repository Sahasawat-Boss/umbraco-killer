import { db } from "./db";

export interface RouteNode {
  id: string;
  parentId: string | null;
  urlSegment: string;
  sortOrder: number;
  published: boolean;
  trashed: boolean;
}

/**
 * Umbraco-style routing without domains:
 * root nodes map to "/", their descendants to "/segment/child/".
 * A node is routable only if it and all its ancestors are published.
 */
export function computeRoutes(nodes: RouteNode[], publishedOnly: boolean) {
  const byParent = new Map<string | null, RouteNode[]>();
  for (const n of nodes) {
    if (n.trashed) continue;
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);

  const routeById = new Map<string, string>();
  const idByRoute = new Map<string, string>();

  const walk = (parentId: string | null, base: string | null) => {
    for (const n of byParent.get(parentId) ?? []) {
      if (publishedOnly && !n.published) continue;
      const route = base === null ? "/" : `${base}${n.urlSegment}/`;
      routeById.set(n.id, route);
      if (!idByRoute.has(route)) idByRoute.set(route, n.id);
      walk(n.id, base === null ? "/" : route);
    }
  };
  walk(null, null);
  return { routeById, idByRoute };
}

const ROUTE_SELECT = {
  id: true,
  parentId: true,
  urlSegment: true,
  sortOrder: true,
  published: true,
  trashed: true,
} as const;

export async function getPublishedRoutes() {
  const nodes = await db.document.findMany({ select: ROUTE_SELECT });
  return computeRoutes(nodes, true);
}

export async function getAllRoutes() {
  const nodes = await db.document.findMany({ select: ROUTE_SELECT });
  return computeRoutes(nodes, false);
}

export function normalizePath(path: string) {
  let p = decodeURIComponent(path || "/");
  if (!p.startsWith("/")) p = "/" + p;
  if (!p.endsWith("/")) p += "/";
  return p.normalize("NFC").toLowerCase();
}
