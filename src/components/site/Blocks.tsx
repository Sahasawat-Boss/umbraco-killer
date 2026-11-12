import Link from "next/link";
import type { ApiBlockList } from "@/lib/delivery";
import type { JsonObject } from "@/lib/utils";

/**
 * Renders a Block List on the default public template.
 * Each Element Type alias maps to a component — add your own to BLOCKS.
 * Unknown block types fall back to a generic view so nothing silently disappears.
 */

type Media = { url: string | null; altText?: string; name?: string } | null;
type ContentLink = { name: string; route: { path: string } } | null;

const s = (v: unknown) => (typeof v === "string" ? v : "");
const markup = (v: unknown) => (v && typeof v === "object" && "markup" in v ? String((v as { markup: unknown }).markup ?? "") : "");

export function isBlockList(v: unknown): v is ApiBlockList {
  return !!v && typeof v === "object" && Array.isArray((v as ApiBlockList).items) && (v as ApiBlockList).items.every((i) => i?.content?.contentType);
}

const BLOCKS: Record<string, (p: JsonObject) => React.ReactNode> = {
  richTextBlock: (p) =>
    markup(p.text) && (
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rte text-[17px]" dangerouslySetInnerHTML={{ __html: markup(p.text) }} />
      </section>
    ),

  imageBlock: (p) => {
    const img = p.image as Media;
    if (!img?.url) return null;
    return (
      <figure className="mx-auto max-w-5xl px-6 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.altText || s(p.caption)} className="w-full rounded-xl" />
        {s(p.caption) && <figcaption className="mt-3 text-center text-sm text-muted">{s(p.caption)}</figcaption>}
      </figure>
    );
  },

  featureGrid: (p) => {
    const features = isBlockList(p.features) ? p.features.items : [];
    return (
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          {s(p.heading) && <h2 className="text-center text-3xl font-bold">{s(p.heading)}</h2>}
          {s(p.intro) && <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{s(p.intro)}</p>}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ content: f }, i) => (
              <div key={f.id} className="rounded-xl bg-white p-6 shadow-sm">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{s(f.properties.title)}</h3>
                {s(f.properties.text) && <p className="mt-1.5 text-sm text-muted">{s(f.properties.text)}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },

  callToAction: (p) => {
    const link = p.buttonLink as ContentLink;
    return (
      <section className="px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-2xl bg-[var(--accent)] px-8 py-12 text-center text-white md:flex-row md:text-left">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{s(p.heading)}</h2>
            {s(p.text) && <p className="mt-2 text-white/85">{s(p.text)}</p>}
          </div>
          {link && (
            <Link href={link.route.path} className="rounded-full bg-white px-6 py-3 font-bold text-[var(--accent)] shadow hover:shadow-lg">
              {s(p.buttonText) || link.name}
            </Link>
          )}
        </div>
      </section>
    );
  },

  quoteBlock: (p) => (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <blockquote className="border-l-4 border-[var(--accent)] pl-6">
        <p className="text-2xl leading-snug font-bold">“{s(p.quote)}”</p>
        {s(p.author) && <footer className="mt-3 text-sm text-muted">— {s(p.author)}</footer>}
      </blockquote>
    </section>
  ),
};

function FallbackBlock({ contentType, properties }: { contentType: string; properties: JsonObject }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-6">
      <div className="rounded-lg border border-dashed border-black/15 p-5">
        <div className="mb-2 font-mono text-xs text-muted">{contentType}</div>
        {Object.entries(properties).map(([k, v]) =>
          typeof v === "string" && v ? (
            <p key={k} className="text-sm">
              <b>{k}:</b> {v}
            </p>
          ) : markup(v) ? (
            <div key={k} className="rte text-sm" dangerouslySetInnerHTML={{ __html: markup(v) }} />
          ) : null,
        )}
      </div>
    </section>
  );
}

export function BlockListView({ value }: { value: ApiBlockList }) {
  return (
    <>
      {value.items.map(({ content }) => {
        const render = BLOCKS[content.contentType];
        return (
          <div key={content.id} data-block={content.contentType}>
            {render ? render(content.properties) : <FallbackBlock {...content} />}
          </div>
        );
      })}
    </>
  );
}
