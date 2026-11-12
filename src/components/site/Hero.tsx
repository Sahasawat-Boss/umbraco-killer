import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";

type Cta = { name: string; path: string };

/**
 * Public-site hero: dark stage with a masked grid, drifting accent glows,
 * optional Ken Burns background image, gradient headline and CTA buttons.
 * Colours follow the site's `--accent` CSS variable.
 */
export function Hero({
  title,
  text,
  imageUrl,
  eyebrow,
  ctas = [],
}: {
  title: string;
  text?: string;
  imageUrl?: string;
  eyebrow?: string;
  ctas?: Cta[];
}) {
  // Highlight the last word with a gradient (only when the title has several words —
  // e.g. Thai titles without spaces are rendered as-is).
  const words = title.trim().split(/\s+/);
  const lead = words.length > 1 ? words.slice(0, -1).join(" ") + " " : "";
  const last = words.length > 1 ? words[words.length - 1] : "";
  const [primary, secondary] = ctas;

  return (
    <section className="hero relative isolate overflow-hidden bg-[#12030a] text-white">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="hero-kenburns absolute inset-0 -z-30 size-full object-cover opacity-35" />
      )}

      {/* Drifting glows */}
      <div className="hero-blob-a absolute -top-40 -right-32 -z-20 size-[36rem] rounded-full bg-[var(--accent)] opacity-50 blur-[120px]" />
      <div className="hero-blob-b absolute -bottom-48 -left-40 -z-20 size-[30rem] rounded-full bg-[#ff7a45] opacity-25 blur-[120px]" />

      {/* Grid, faded out towards the edges */}
      <div className="hero-grid absolute inset-0 -z-10" />
      {/* Bottom fade into the page */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-[#12030a]" />

      <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-6 py-28">
        <div className="hero-rise inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white/80 backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--accent)]" />
          </span>
          {eyebrow ?? (
            <>
              <Sparkles className="size-3.5" /> Welcome
            </>
          )}
        </div>

        <h1 className="hero-rise mt-6 max-w-4xl text-5xl font-black leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-7xl">
          {lead}
          {last && (
            <span className="hero-gradient-text bg-gradient-to-r from-[var(--accent)] via-[#ff8a65] to-[var(--accent)] bg-clip-text text-transparent">
              {last}
            </span>
          )}
          {!last && title}
        </h1>

        {text && (
          <p className="hero-rise mt-6 max-w-2xl text-lg leading-relaxed text-white/70 [animation-delay:160ms] sm:text-xl">
            {text}
          </p>
        )}

        {primary && (
          <div className="hero-rise mt-10 flex flex-wrap gap-3 [animation-delay:240ms]">
            <Link
              href={primary.path}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-bold text-white shadow-[0_10px_40px_-10px_var(--accent)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              {primary.name}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            {secondary && (
              <Link
                href={secondary.path}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-bold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
              >
                {secondary.name}
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center text-white/40">
        <ChevronDown className="hero-bounce size-6" />
      </div>
    </section>
  );
}
