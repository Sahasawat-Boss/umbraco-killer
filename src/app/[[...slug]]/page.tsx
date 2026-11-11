import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { contentToApi, findByIdOrPath, loadDeliveryContext, type DeliveryContext } from "@/lib/delivery";
import { isInstalled } from "@/lib/install";
import { LogoMark } from "@/components/Logo";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Api = ReturnType<typeof contentToApi>;
type Props = { params: Promise<{ slug?: string[] }> };

async function resolve(slug?: string[]) {
  const ctx = await loadDeliveryContext();
  const path = "/" + (slug ?? []).map(decodeURIComponent).join("/");
  const doc = findByIdOrPath(path, ctx);
  return { ctx, doc };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { ctx, doc } = await resolve(slug);
  if (!doc) return { title: "Not found" };
  const p = contentToApi(doc, ctx).properties;
  return {
    title: (p.metaTitle as string) || (p.title as string) || doc.publishedName || doc.name,
    description: (p.metaDescription as string) || (p.excerpt as string) || undefined,
  };
}

/**
 * Default "template" for the public website. It renders any document type generically,
 * so content is viewable before you build a real frontend on the Delivery API.
 */
export default async function PublicPage({ params }: Props) {
  const { slug } = await params;
  if (!slug && !(await isInstalled())) redirect("/install");
  const { ctx, doc } = await resolve(slug);
  if (!doc) {
    if (!slug && ctx.published.length === 0) return <EmptySite />;
    notFound();
  }
  const page = contentToApi(doc, ctx);
  const root = ctx.published.find((d) => d.parentId === null)!;
  const rootApi = contentToApi(root, ctx);
  const nav = navItems(root.id, ctx);
  const children = ctx.published.filter((d) => d.parentId === doc.id).map((d) => contentToApi(d, ctx));
  const p = page.properties;
  const accent = (rootApi.properties.accentColor as string) || "#c62828";
  const hero = p.heroImage as { url: string } | null;
  const image = p.image as { url: string; altText: string } | null;

  return (
    <div className="min-h-screen bg-white" style={{ ["--accent" as string]: accent }}>
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <LogoMark size={26} />
            {rootApi.name}
          </Link>
          <nav className="flex gap-6 text-sm">
            {nav.map((n) => (
              <Link key={n.id} href={n.path} className={page.route.path?.startsWith(n.path) ? "font-bold text-[var(--accent)]" : "text-muted hover:text-ink"}>
                {n.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {typeof p.heroTitle === "string" ? (
        <section className="relative overflow-hidden bg-header text-white">
          {hero?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.url} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--accent),transparent_55%)] opacity-50" />
          <div className="relative mx-auto max-w-6xl px-6 py-28">
            <h1 className="max-w-3xl text-5xl font-bold leading-tight">{p.heroTitle}</h1>
            {typeof p.heroText === "string" && <p className="mt-5 max-w-2xl text-lg text-white/80">{p.heroText}</p>}
          </div>
        </section>
      ) : (
        <section className="border-b border-black/5 bg-surface">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <Breadcrumbs doc={doc} ctx={ctx} />
            <h1 className="text-4xl font-bold">{(p.title as string) || page.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              {typeof p.publishDate === "string" && p.publishDate && <span>{formatDate(p.publishDate, false)}</span>}
              {typeof p.category === "string" && p.category && (
                <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-bold text-white">{p.category}</span>
              )}
            </div>
            {typeof p.intro === "string" && <p className="mt-4 text-lg text-muted">{p.intro}</p>}
          </div>
        </section>
      )}

      <main className="mx-auto max-w-3xl px-6 py-12">
        {image?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.altText || ""} className="mb-8 w-full rounded-lg" />
        )}
        {(p.bodyText as { markup?: string } | null)?.markup && (
          <div className="rte text-[17px]" dangerouslySetInnerHTML={{ __html: (p.bodyText as { markup: string }).markup }} />
        )}
        {Array.isArray(p.tags) && p.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {(p.tags as string[]).map((t) => (
              <span key={t} className="rounded-full bg-surface px-3 py-1 text-sm">#{t}</span>
            ))}
          </div>
        )}
        {children.length > 0 && <ChildList items={children} />}
      </main>

      <footer className="border-t border-black/5 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
          <span>{(rootApi.properties.footerText as string) || rootApi.name}</span>
          {typeof rootApi.properties.contactEmail === "string" && (
            <a href={`mailto:${rootApi.properties.contactEmail}`} className="hover:text-ink">{rootApi.properties.contactEmail}</a>
          )}
        </div>
      </footer>
    </div>
  );
}

function navItems(rootId: string, ctx: DeliveryContext) {
  return ctx.published
    .filter((d) => d.parentId === rootId)
    .map((d) => contentToApi(d, ctx))
    .filter((d) => !d.properties.hideFromNavigation)
    .map((d) => ({ id: d.id, name: d.name, path: d.route.path! }));
}

function Breadcrumbs({ doc, ctx }: { doc: DeliveryContext["docs"][number]; ctx: DeliveryContext }) {
  const chain: { name: string; path: string }[] = [];
  let cur = doc.parentId;
  while (cur) {
    const d = ctx.docById.get(cur);
    if (!d) break;
    chain.unshift({ name: d.publishedName ?? d.name, path: ctx.routeById.get(d.id) ?? "/" });
    cur = d.parentId;
  }
  if (!chain.length) return null;
  return (
    <div className="mb-4 flex gap-2 text-sm text-muted">
      {chain.map((c, i) => (
        <span key={c.path} className="flex gap-2">
          {i > 0 && "/"}
          <Link href={c.path} className="hover:text-ink">{c.name}</Link>
        </span>
      ))}
    </div>
  );
}

function ChildList({ items }: { items: Api[] }) {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2">
      {items.map((c) => {
        const img = c.properties.image as { url: string } | null;
        return (
          <Link key={c.id} href={c.route.path!} className="group overflow-hidden rounded-lg border border-black/10 transition hover:shadow-lg">
            {img?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt="" className="aspect-video w-full object-cover" />
            )}
            <div className="p-5">
              <div className="text-lg font-bold group-hover:text-[var(--accent)]">{(c.properties.title as string) || c.name}</div>
              {typeof c.properties.excerpt === "string" && <p className="mt-1 text-sm text-muted">{c.properties.excerpt}</p>}
              {typeof c.properties.publishDate === "string" && c.properties.publishDate && (
                <p className="mt-2 text-xs text-muted">{formatDate(c.properties.publishDate, false)}</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptySite() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-header p-8 text-center text-white">
      <LogoMark size={64} />
      <h1 className="mt-6 text-3xl font-bold">Welcome to your umb-killer site</h1>
      <p className="mt-3 max-w-md text-white/70">There is no published content yet. Log in to the backoffice, create a page and publish it.</p>
      <Link href="/umbraco" className="mt-6 rounded bg-brand-600 px-5 py-2.5 font-bold hover:bg-brand-500">Open backoffice</Link>
    </div>
  );
}
