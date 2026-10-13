import type { Metadata } from "next";
import { Section, SectionHeader, FeatureGrid } from "@/components/marketing/blocks";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Interactive widgets",
  description:
    "Carousels, charts, galleries, timelines, accordions and forms — the interactive components you can place in any scroll-driven story, all keyboard accessible and reduced-motion aware.",
  alternates: { canonical: "/widgets" },
};

const WIDGETS = [
  { title: "Charts", body: "Bar and series charts rendered from structured data, with screen-reader summaries and no third-party scripts." },
  { title: "Carousels", body: "Image rotators with keyboard controls, touch gestures and visible position indicators." },
  { title: "Galleries", body: "Responsive image grids with captions, lazy loading and reserved space to avoid layout shift." },
  { title: "Timelines", body: "Chronological narratives that work as a static list without JavaScript." },
  { title: "Statistics", body: "Large-number callouts with supporting labels for emphasis without exaggeration." },
  { title: "Comparison tables", body: "Before/after or option-by-option contrasts for proposals and evaluations." },
  { title: "FAQ accordions", body: "Disclosure panels whose answers remain in the DOM for search engines and screen readers." },
  { title: "Contact & lead forms", body: "Validated on the client and the server, with spam checks, rate limiting and consent." },
  { title: "Interactive callouts", body: "Highlighted asides that draw the eye to the one line that matters." },
  { title: "Product calls to action", body: "Buttons and links with configurable destinations, never dead decorative controls." },
];

export default function WidgetsPage() {
  return (
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            eyebrow="Interactive widgets"
            title="Interaction that earns its place"
            lede="Every widget is part of the structured schema, so it can be added, configured and reordered in the visual editor — and it stays accessible without a mouse."
          />
          <FeatureGrid columns={3} items={WIDGETS} />
        </div>
      </Section>

      <Section tone="ink">
        <div className="container-wide flex flex-col items-center gap-6 py-20 text-center">
          <h2 className="text-display max-w-2xl text-4xl">Compose interactions, don&apos;t code them.</h2>
          <ButtonLink href="/sign-up" size="lg" variant="accent">
            Try the editor
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
