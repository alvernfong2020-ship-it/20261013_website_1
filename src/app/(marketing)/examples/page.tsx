import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/marketing/blocks";
import { StoryRenderer } from "@/components/story/StoryRenderer";
import { ButtonLink, Badge } from "@/components/ui/primitives";
import { EXAMPLE_STORIES } from "@/lib/marketing/examples";
import { Accordion } from "@/components/marketing/Accordion";

export const metadata: Metadata = {
  title: "Examples & inspiration",
  description:
    "Explore original scroll-driven story examples built with Scrollwright — from brand narratives and product launches to annual reports and data stories.",
  alternates: { canonical: "/examples" },
};

export default function ExamplesPage() {
  const [feature, ...rest] = EXAMPLE_STORIES;

  return (
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            eyebrow="Examples"
            title="Stories you can scroll right now"
            lede="Each of these is a real, schema-valid document rendered by the production scrollytelling engine. Pick one as a starting point, or open it in the editor to see how it is built."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/sign-up">Start from an example</ButtonLink>
            <ButtonLink href="/templates" variant="secondary">
              Browse templates
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-wide py-16">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <Badge tone="accent" className="mb-4">
                Featured
              </Badge>
              <h2 className="font-display text-3xl">{feature.title}</h2>
              <p className="mt-3 max-w-lg text-ink-soft">{feature.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {feature.tags.map((t) => (
                  <Badge key={t} tone="neutral">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <ButtonLink href={`/s/${feature.slug}`}>View the story</ButtonLink>
                <ButtonLink href={`/templates`} variant="secondary">
                  Use as a template
                </ButtonLink>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-line shadow-md">
              <div className="max-h-[520px] overflow-y-auto">
                <StoryRenderer document={feature.document} showProgress={false} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="container-wide py-16">
          <SectionHeader eyebrow="More stories" title="Browse by kind of story" />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((ex) => (
              <article key={ex.slug} className="flex flex-col rounded-xl border border-line bg-paper-raised p-5">
                <div className="mb-4 overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ex.thumbnail}
                    alt={`${ex.title} preview`}
                    width={400}
                    height={260}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                </div>
                <Badge tone="neutral" className="mb-3 self-start">
                  {ex.category}
                </Badge>
                <h3 className="font-display text-xl">{ex.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink-soft">{ex.description}</p>
                <ButtonLink href={`/s/${ex.slug}`} variant="ghost" size="sm" className="mt-4 self-start px-0">
                  View story →
                </ButtonLink>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-wide grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Behind the scenes" title="How these are built" />
          <Accordion
            items={[
              {
                question: "Are these screenshots?",
                answer:
                  "No. Every example above is a structured JSON document rendered live by the same React engine used on published stories — the same sections, animations and reduced-motion handling.",
              },
              {
                question: "Can I copy one?",
                answer:
                  "Yes. Templates can be duplicated into a new draft in your workspace with one action, and then edited freely. The original is never affected by your changes.",
              },
              {
                question: "How do the animations behave on mobile?",
                answer:
                  "Pinned and parallax effects fall back to a stacked, static layout on small screens and whenever the reader prefers reduced motion. Content is always readable even if an animation never runs.",
              },
            ]}
          />
        </div>
      </Section>
    </>
  );
}
