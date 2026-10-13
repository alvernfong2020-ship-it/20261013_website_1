import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Badge, Card } from "@/components/ui/primitives";
import { Section, SectionHeader, FeatureGrid, StepList, StatRow } from "@/components/marketing/blocks";
import { PricingCards } from "@/components/marketing/PricingCards";
import { Accordion } from "@/components/marketing/Accordion";
import { ProductDemo } from "@/components/marketing/ProductDemo";
import { StoryRenderer } from "@/components/story/StoryRenderer";
import { HERO_STORY } from "@/lib/marketing/samples";
import { STORY_TYPES, AUDIENCES, FAQS_HOME } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Scrollwright — Turn ideas into immersive scrolling stories",
  description:
    "Turn documents, links and rough ideas into immersive, scroll-driven web stories. AI-assisted drafting, a visual editor and a reusable scrollytelling engine — no code required.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      {/* Hero -------------------------------------------------------------- */}
      <Section className="relative overflow-hidden">
        <div className="container-wide grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <Badge tone="accent" className="mb-6">
              AI-assisted · Visual editor · No code
            </Badge>
            <h1 className="text-display text-4xl sm:text-6xl lg:text-7xl">
              Turn any idea into an immersive <span className="text-accent">scrolling story</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Paste a document, drop a link, or describe what you want to say. Scrollwright drafts a
              structured narrative, then hands you a visual editor to refine pacing, imagery and
              motion — and publishes it as a fast, accessible website.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/sign-up" size="lg">
                Start creating — free
              </ButtonLink>
              <ButtonLink href="/examples" size="lg" variant="secondary">
                Explore examples
              </ButtonLink>
            </div>
            <p className="mt-5 text-sm text-ink-faint">
              No credit card. The AI pipeline runs from a swappable provider adapter, with a labelled
              demo mode when no model is connected.
            </p>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-accent-soft/50 blur-2xl" />
            <Card className="grain relative overflow-hidden p-0 shadow-lg">
              <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="ml-3 text-xs text-ink-faint">/s/the-long-read</span>
              </div>
              <div className="max-h-[460px] overflow-y-auto">
                <StoryRenderer document={HERO_STORY} showProgress={false} />
              </div>
            </Card>
            <p className="mt-3 text-center text-xs text-ink-faint">
              A live story rendered by the same engine that ships to production.
            </p>
          </div>
        </div>
      </Section>

      {/* Story types ------------------------------------------------------- */}
      <Section tone="sunken" id="story-types">
        <div className="container-wide py-20">
          <SectionHeader
            eyebrow="What you can make"
            title="One studio, every kind of story"
            lede="The same structured format powers everything from a one-page summary to a full annual report — each with its own layout, typography and motion."
          />
          <FeatureGrid
            columns={4}
            items={STORY_TYPES.map((t) => ({ title: t.title, body: t.body, href: t.href }))}
          />
        </div>
      </Section>

      {/* How it works ------------------------------------------------------ */}
      <Section id="how-it-works">
        <div className="container-wide py-20">
          <SectionHeader
            eyebrow="How it works"
            title="Describe. Refine. Publish."
            lede="A three-stage workflow that works whether you start from a sentence or a fifty-page document."
          />
          <StepList
            steps={[
              {
                n: "01",
                title: "Describe or import",
                body: "Write a prompt, paste existing copy, upload a document or point us at a URL. We normalise it into a clean source.",
              },
              {
                n: "02",
                title: "Refine in the editor",
                body: "Reorder sections, rewrite inline, swap imagery and tune animation presets. Undo, autosave and version history keep you safe.",
              },
              {
                n: "03",
                title: "Publish and measure",
                body: "Publish a frozen version to a public URL, share it, and watch scroll depth, section reach and call-to-action clicks.",
              },
            ]}
          />
          <StatRow
            stats={[
              { value: "18", label: "Section types, from hero to FAQ" },
              { value: "13", label: "Starter templates, fully editable" },
              { value: "0", label: "Lines of code required" },
            ]}
          />
        </div>
      </Section>

      {/* Product demonstration -------------------------------------------- */}
      <Section tone="sunken" id="demo">
        <div className="container-wide py-20">
          <SectionHeader
            eyebrow="Product tour"
            title="A real editor, not a screenshot"
            lede="Reorder sections, edit headings, switch templates and publish — all handled live by the actual application components."
          />
          <div className="mt-12">
            <ProductDemo />
          </div>
        </div>
      </Section>

      {/* Audiences --------------------------------------------------------- */}
      <Section id="audiences">
        <div className="container-wide py-20">
          <SectionHeader
            eyebrow="Who it's for"
            title="Built for people with something to say"
            lede="Marketing teams, founders, agencies, educators and researchers all need the same thing: a page people actually finish."
          />
          <FeatureGrid columns={3} items={AUDIENCES} />
        </div>
      </Section>

      {/* Pricing ----------------------------------------------------------- */}
      <Section tone="sunken" id="pricing">
        <div className="container-wide py-20">
          <SectionHeader
            align="center"
            eyebrow="Pricing"
            title="Plans that scale with your publishing"
            lede="Start free. Upgrade when you need more AI credits, published stories, custom domains or team seats."
          />
          <div className="mt-12">
            <PricingCards />
          </div>
        </div>
      </Section>

      {/* FAQ --------------------------------------------------------------- */}
      <Section id="faq">
        <div className="container-wide grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeader eyebrow="FAQ" title="Questions, answered" />
            <p className="mt-4 text-sm text-ink-soft">
              Still unsure?{" "}
              <Link href="/contact" className="text-accent underline underline-offset-2">
                Get in touch
              </Link>
              .
            </p>
          </div>
          <Accordion items={FAQS_HOME} />
        </div>
      </Section>

      {/* Closing CTA ------------------------------------------------------- */}
      <Section tone="ink">
        <div className="container-wide flex flex-col items-center gap-6 py-24 text-center">
          <h2 className="text-display max-w-3xl text-4xl sm:text-5xl">
            Your idea deserves a page people finish.
          </h2>
          <p className="max-w-xl text-ink-faint">
            Start free, publish in minutes, and measure what actually holds attention.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/sign-up" size="lg" variant="accent">
              Start creating
            </ButtonLink>
            <ButtonLink
              href="/templates"
              size="lg"
              variant="secondary"
              className="border-paper/30 bg-transparent text-paper hover:bg-paper/10"
            >
              Browse templates
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
