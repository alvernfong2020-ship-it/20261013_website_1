"use client";

import React from "react";
import { RichText } from "@/lib/story/markdown";
import type { StorySection } from "@/lib/story/schema";
import { Reveal, Parallax, StickyChapter } from "./engine";

/* =========================================================================
   Section renderers — a component registry keyed by section type.
   Unknown types render nothing (they are already stripped by validation).
   ========================================================================= */

export type SectionRenderProps = {
  section: StorySection;
  /** Interactive mode is used in the editor/preview (adds ids, disables links). */
  mode?: "published" | "preview";
  onCta?: (section: StorySection) => void;
};

const spacingClass: Record<string, string> = {
  none: "py-0",
  sm: "py-8",
  md: "py-14",
  lg: "py-24",
  xl: "py-36",
};

const widthClass: Record<string, string> = {
  narrow: "max-w-2xl",
  wide: "max-w-5xl",
  full: "max-w-none",
  bleed: "max-w-none",
};

function containerFor(section: StorySection) {
  const w = section.layout.width === "bleed" ? "max-w-none" : widthClass[section.layout.width];
  return `mx-auto px-6 ${w}`;
}

function bgStyle(section: StorySection): React.CSSProperties {
  const bg = section.background;
  const style: React.CSSProperties = {};
  if (bg.type === "color" && bg.color) style.backgroundColor = bg.color;
  if (bg.type === "gradient" && bg.gradient) {
    style.backgroundImage = `linear-gradient(${bg.gradient.angle}deg, ${bg.gradient.from}, ${bg.gradient.to})`;
  }
  return style;
}

function BackgroundMedia({ section }: { section: StorySection }) {
  const bg = section.background;
  if (bg.type === "image" && bg.image?.url) {
    return (
      <>
        <div
          className={"absolute inset-0 bg-cover bg-center " + (bg.fixed ? "bg-fixed" : "")}
          style={{ backgroundImage: `url("${bg.image.url}")` }}
          aria-hidden="true"
        />
        {bg.overlay > 0 && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(23,22,20,${bg.overlay})` }}
            aria-hidden="true"
          />
        )}
      </>
    );
  }
  if (bg.type === "video" && bg.videoUrl) {
    return (
      <>
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={bg.videoUrl}
          poster={bg.poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        {bg.overlay > 0 && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(23,22,20,${bg.overlay})` }} aria-hidden="true" />
        )}
      </>
    );
  }
  return null;
}

const onDark = (section: StorySection) =>
  section.background.type === "image" ||
  section.background.type === "video" ||
  (section.background.type === "color" && section.background.overlay > 0.4);

// ---------------------------------------------------------------------------
// Individual renderers
// ---------------------------------------------------------------------------

function Hero({ section }: SectionRenderProps) {
  const dark = onDark(section);
  const media = section.media[0];
  return (
    <section id={section.anchorId || section.id} className="relative overflow-hidden">
      <BackgroundMedia section={section} />
      <div
        className={`${containerFor(section)} ${spacingClass[section.spacing.top]} relative grid items-center gap-12 ${
          media && section.layout.columns === "split" ? "md:grid-cols-2" : ""
        }`}
      >
        <Reveal animation={section.animation}>
          <div style={{ textAlign: section.layout.align }}>
            {section.eyebrow && (
              <p className={`eyebrow mb-4 ${dark ? "text-white/70" : ""}`}>{section.eyebrow}</p>
            )}
            {section.heading && (
              <h1
                className={`text-display text-5xl sm:text-6xl lg:text-7xl ${dark ? "text-white" : ""}`}
              >
                {section.heading}
              </h1>
            )}
            {section.subheading && (
              <p className={`mt-6 max-w-2xl text-lg sm:text-xl ${dark ? "text-white/85" : "text-ink-soft"} ${
                section.layout.align === "center" ? "mx-auto" : ""
              }`}>
                {section.subheading}
              </p>
            )}
            {section.content && (
              <RichText
                content={section.content}
                className={`mt-6 max-w-2xl space-y-4 text-lg ${dark ? "text-white/85" : "text-ink-soft"}`}
              />
            )}
            {section.interaction.type === "cta" && section.interaction.label && (
              <div className="mt-9">
                <CtaButton section={section} />
              </div>
            )}
          </div>
        </Reveal>
        {media && (
          <Reveal animation={{ ...section.animation, preset: "scale-in" }}>
            <MediaFrame media={media} priority />
          </Reveal>
        )}
      </div>
    </section>
  );
}

function MediaFrame({
  media,
  className = "",
  priority = false,
}: {
  media: NonNullable<StorySection["media"][number]>;
  className?: string;
  priority?: boolean;
}) {
  const isVideo = /\.(mp4|webm)$/i.test(media.url) || media.url.startsWith("data:video");
  return (
    <figure className={"overflow-hidden rounded-xl border border-line bg-paper-sunken " + className}>
      {isVideo ? (
        <video src={media.url} controls className="h-full w-full object-cover" />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={media.url}
          alt={media.alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: media.focalPoint }}
        />
      )}
      {media.caption && (
        <figcaption className="border-t border-line px-4 py-2 text-xs text-ink-faint">
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}

function RichTextSection({ section }: SectionRenderProps) {
  const dark = onDark(section);
  return (
    <section id={section.anchorId || section.id} className="relative">
      <BackgroundMedia section={section} />
      <div className={`${containerFor(section)} ${spacingClass[section.spacing.top]} relative`}>
        <Reveal animation={section.animation} className={section.layout.width === "narrow" ? "mx-auto" : ""}>
          {section.eyebrow && <p className="eyebrow mb-3">{section.eyebrow}</p>}
          {section.heading && (
            <h2 className={`text-display text-4xl sm:text-5xl ${dark ? "text-white" : ""}`}>{section.heading}</h2>
          )}
          {section.subheading && (
            <p className={`mt-4 text-xl ${dark ? "text-white/80" : "text-ink-soft"}`}>{section.subheading}</p>
          )}
          {section.content && (
            <RichText
              content={section.content}
              className={`mt-6 space-y-5 text-lg leading-relaxed ${dark ? "text-white/85" : "text-ink-soft"}`}
            />
          )}
        </Reveal>
      </div>
    </section>
  );
}

function ImageText({ section }: SectionRenderProps) {
  const media = section.media[0];
  const pos = section.layout.mediaPosition;
  const mediaFirst = pos === "left";
  return (
    <section id={section.anchorId || section.id} className="relative">
      <BackgroundMedia section={section} />
      <div className={`${containerFor(section)} ${spacingClass[section.spacing.top]} relative`}>
        <div className={`grid items-center gap-12 ${media ? "md:grid-cols-2" : ""}`}>
          <Reveal animation={section.animation} className={mediaFirst ? "md:order-1" : "md:order-2"}>
            <div>
              {section.eyebrow && <p className="eyebrow mb-3">{section.eyebrow}</p>}
              {section.heading && <h2 className="text-display text-4xl">{section.heading}</h2>}
              {section.content && (
                <RichText content={section.content} className="mt-5 space-y-4 text-lg text-ink-soft" />
              )}
              {section.interaction.type === "cta" && section.interaction.label && (
                <div className="mt-7">
                  <CtaButton section={section} />
                </div>
              )}
            </div>
          </Reveal>
          {media && (
            <Reveal
              animation={{ ...section.animation, preset: "fade-in" }}
              className={mediaFirst ? "md:order-2" : "md:order-1"}
            >
              <MediaFrame media={media} className="aspect-[4/3]" />
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

function FullscreenImage({ section }: SectionRenderProps) {
  const media = section.media[0];
  const url = media?.url || section.background.image?.url;
  return (
    <section id={section.anchorId || section.id} className="relative h-[80vh] min-h-[420px] overflow-hidden">
      {url ? (
        <Parallax distance={section.animation.distance} className="absolute inset-0">
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${url}")` }} aria-hidden="true" />
        </Parallax>
      ) : (
        <div className="absolute inset-0 bg-paper-sunken" aria-hidden="true" />
      )}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(23,22,20,${section.background.overlay || 0.35})` }} aria-hidden="true" />
      <div className="relative flex h-full items-end">
        <div className={`${containerFor(section)} pb-16 text-white`}>
          <Reveal animation={section.animation}>
            {section.heading && <h2 className="text-display text-4xl sm:text-5xl">{section.heading}</h2>}
            {section.subheading && <p className="mt-4 max-w-2xl text-lg text-white/85">{section.subheading}</p>}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function VideoSection({ section }: SectionRenderProps) {
  const media = section.media[0];
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-8 text-center text-4xl">{section.heading}</h2>}
      {media ? (
        <Reveal animation={section.animation}>
          <video src={media.url} poster={section.background.poster} controls className="w-full rounded-xl border border-line" />
        </Reveal>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-line-strong text-ink-faint">
          No video selected
        </div>
      )}
    </section>
  );
}

function Quote({ section }: SectionRenderProps) {
  const attribution = (section.data?.attribution as string) || undefined;
  return (
    <section id={section.anchorId || section.id} className="relative">
      <BackgroundMedia section={section} />
      <div className={`${containerFor(section)} ${spacingClass[section.spacing.top]} relative`}>
        <Reveal animation={section.animation}>
          <figure className="mx-auto max-w-3xl text-center">
            <blockquote className="text-display text-3xl sm:text-4xl italic">
              {section.content || "A memorable line."}
            </blockquote>
            {attribution && (
              <figcaption className="mt-6 text-sm uppercase tracking-widest text-ink-faint">{attribution}</figcaption>
            )}
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

function Timeline({ section }: SectionRenderProps) {
  const items = (section.data?.items as { date: string; title: string; body?: string }[]) || [];
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-12 text-4xl">{section.heading}</h2>}
      <ol className="relative border-l border-line pl-8">
        {items.map((item, i) => (
          <li key={i} className="mb-12 last:mb-0">
            <Reveal animation={section.animation}>
              <span className="absolute -left-[7px] mt-2 h-3 w-3 rounded-full border-2 border-paper bg-accent" aria-hidden="true" />
              <p className="text-xs uppercase tracking-widest text-ink-faint">{item.date}</p>
              <h3 className="mt-2 font-display text-2xl">{item.title}</h3>
              {item.body && <p className="mt-2 max-w-2xl text-ink-soft">{item.body}</p>}
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Statistics({ section }: SectionRenderProps) {
  const stats = (section.data?.stats as { value: string; label: string; description?: string }[]) || [];
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-4 text-4xl">{section.heading}</h2>}
      {section.subheading && <p className="mb-12 text-lg text-ink-soft">{section.subheading}</p>}
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal key={i} animation={{ ...section.animation, delay: i * 80 }}>
            <div className="border-t border-line-strong pt-6">
              <p className="text-display text-5xl text-accent-strong">{s.value}</p>
              <p className="mt-3 font-medium">{s.label}</p>
              {s.description && <p className="mt-1 text-sm text-ink-soft">{s.description}</p>}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeatureShowcase({ section }: SectionRenderProps) {
  const features = (section.data?.items as { title: string; body?: string; media?: { url: string; alt: string } }[]) || [];
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-12 text-4xl">{section.heading}</h2>}
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={i} animation={{ ...section.animation, delay: i * 80 }}>
            <div className="rounded-xl border border-line bg-paper-raised p-6">
              {f.media?.url && <MediaFrame media={{ url: f.media.url, alt: f.media.alt, focalPoint: "center" }} className="mb-5 aspect-video" />}
              <h3 className="font-display text-2xl">{f.title}</h3>
              {f.body && <p className="mt-3 text-ink-soft">{f.body}</p>}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Gallery({ section }: SectionRenderProps) {
  const items = section.media;
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-3 text-4xl">{section.heading}</h2>}
      {section.subheading && <p className="mb-10 text-ink-soft">{section.subheading}</p>}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center text-ink-faint">
          Add images from the asset library.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => (
            <Reveal key={i} animation={{ ...section.animation, delay: i * 60 }}>
              <MediaFrame media={m} className="aspect-square" />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

function ChartSection({ section }: SectionRenderProps) {
  const series = (section.data?.series as { label: string; value: number; color?: string }[]) || [
    { label: "Q1", value: 38 },
    { label: "Q2", value: 54 },
    { label: "Q3", value: 71 },
    { label: "Q4", value: 92 },
  ];
  const max = Math.max(...series.map((s) => s.value), 1);
  const summary = series.map((s) => `${s.label}: ${s.value}`).join(", ");
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-3 text-4xl">{section.heading}</h2>}
      {section.subheading && <p className="mb-8 text-ink-soft">{section.subheading}</p>}
      {/* Accessible chart: role=img with a text summary, plus a data table */}
      <Reveal animation={section.animation}>
        <div className="rounded-xl border border-line bg-paper-raised p-8" role="img" aria-label={`Bar chart. ${summary}`}>
          <div className="flex h-56 items-end gap-4">
            {series.map((s, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-accent transition-[height] duration-700"
                  style={{ height: `${(s.value / max) * 100}%`, backgroundColor: s.color }}
                />
                <span className="text-xs text-ink-faint">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <details className="mt-4 text-sm text-ink-soft">
          <summary className="cursor-pointer">View data table</summary>
          <table className="mt-3 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2">Label</th>
                <th className="py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-2">{s.label}</td>
                  <td className="py-2">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Reveal>
    </section>
  );
}

function Comparison({ section }: SectionRenderProps) {
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-8 text-4xl">{section.heading}</h2>}
      <Reveal animation={section.animation}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-paper-raised p-8">
            {section.content && <RichText content={section.content.split("\n\n")[0] || ""} className="space-y-3 text-ink-soft" />}
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-8">
            {section.content && (
              <RichText content={section.content.split("\n\n").slice(1).join("\n\n")} className="space-y-3" />
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function CtaButton({ section }: SectionRenderProps) {
  const { interaction } = section;
  return (
    <a
      href={interaction.href || "#"}
      className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-base font-medium text-paper transition-colors hover:bg-accent-strong focus-visible:outline-2"
      {...(/^https?:\/\//i.test(interaction.href || "") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {interaction.label || "Get started"}
      <span aria-hidden="true">→</span>
    </a>
  );
}

function Cta({ section }: SectionRenderProps) {
  return (
    <section id={section.anchorId || section.id} className="relative">
      <BackgroundMedia section={section} />
      <div className={`${containerFor(section)} ${spacingClass[section.spacing.top]} relative`}>
        <Reveal animation={section.animation}>
          <div className="rounded-2xl border border-line bg-paper-raised px-8 py-14 text-center sm:px-16">
            {section.heading && <h2 className="text-display text-4xl sm:text-5xl">{section.heading}</h2>}
            {section.subheading && <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">{section.subheading}</p>}
            <div className="mt-8 flex justify-center">
              <CtaButton section={section} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Faq({ section }: SectionRenderProps) {
  const items = (section.data?.items as { question: string; answer: string }[]) || [];
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-10 text-4xl">{section.heading}</h2>}
      <dl className="divide-y divide-line border-y border-line">
        {items.map((item, i) => (
          <details key={i} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {item.question}
              <span className="text-ink-faint transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <dd className="mt-3 max-w-3xl text-ink-soft">{item.answer}</dd>
          </details>
        ))}
      </dl>
    </section>
  );
}

function ContactForm({ section, mode }: SectionRenderProps) {
  const fields = section.interaction.formFields || [
    { name: "name", label: "Name", type: "text" as const, required: true },
    { name: "email", label: "Email", type: "email" as const, required: true },
    { name: "message", label: "Message", type: "textarea" as const, required: true },
  ];
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      {section.heading && <h2 className="text-display mb-3 text-4xl">{section.heading}</h2>}
      {section.subheading && <p className="mb-8 text-ink-soft">{section.subheading}</p>}
      {mode === "preview" ? (
        <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-ink-faint">
          Forms are disabled in preview. They become live on the published page.
        </div>
      ) : (
        <StoryForm sectionId={section.id} fields={fields} consentText={section.interaction.consentText} />
      )}
    </section>
  );
}

// Loaded lazily to keep the renderer tree-shakeable.
import dynamic from "next/dynamic";
const StoryForm = dynamic(() => import("./StoryForm"), { ssr: false, loading: () => (
  <div className="skeleton h-64 rounded-xl border border-line" aria-hidden="true" />
) });

function Chapter({ section }: SectionRenderProps) {
  return (
    <section id={section.anchorId || section.id} className={`${containerFor(section)} ${spacingClass[section.spacing.top]}`}>
      <div className="border-t border-line pt-10">
        {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
        {section.heading && <h2 className="text-display mt-3 text-5xl">{section.heading}</h2>}
        {section.content && <RichText content={section.content} className="mt-5 max-w-2xl space-y-4 text-lg text-ink-soft" />}
      </div>
    </section>
  );
}

function Spacer({ section }: SectionRenderProps) {
  return <div style={{ height: `${(section.data?.height as number) || 96}px` }} aria-hidden="true" />;
}

export const SECTION_REGISTRY: Record<
  string,
  React.ComponentType<SectionRenderProps>
> = {
  hero: Hero,
  "rich-text": RichTextSection,
  "image-text": ImageText,
  "fullscreen-image": FullscreenImage,
  video: VideoSection,
  quote: Quote,
  timeline: Timeline,
  statistics: Statistics,
  "feature-showcase": FeatureShowcase,
  gallery: Gallery,
  carousel: Gallery, // carousel shares the gallery grid; interaction handled by editor
  chart: ChartSection,
  comparison: Comparison,
  cta: Cta,
  faq: Faq,
  "contact-form": ContactForm,
  chapter: Chapter,
  spacer: Spacer,
};

/** Wraps a section with responsive visibility + spacing bottom. */
export function RenderedSection(props: SectionRenderProps) {
  const { section } = props;
  const Renderer = SECTION_REGISTRY[section.type];
  if (!Renderer) return null;
  const visibility =
    (section.responsive.hideOnMobile ? "hidden md:block " : "") +
    (section.responsive.hideOnDesktop ? "md:hidden " : "");
  const bottomPad: Record<string, string> = {
    none: "pb-0",
    sm: "pb-8",
    md: "pb-14",
    lg: "pb-24",
    xl: "pb-36",
  };
  return (
    <div
      data-section-id={section.id}
      data-section-type={section.type}
      className={`${visibility}${bottomPad[section.spacing.bottom] ?? ""}`}
    >
      <Renderer {...props} />
    </div>
  );
}

export { StickyChapter };
