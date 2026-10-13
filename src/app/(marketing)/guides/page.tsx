import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeader, Prose } from "@/components/marketing/blocks";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Guides & resources",
  description:
    "Practical guides on scroll-driven storytelling, pacing, accessibility, analytics and getting the most from the Scrollwright editor and templates.",
  alternates: { canonical: "/guides" },
};

const GUIDES = [
  {
    slug: "writing-for-scroll",
    title: "Writing for scroll",
    category: "Craft",
    summary: "How to structure a narrative for a reader who controls the pace.",
  },
  {
    slug: "pacing-and-motion",
    title: "Pacing and motion",
    category: "Craft",
    summary: "When to reveal, when to hold, and when to leave things still.",
  },
  {
    slug: "accessible-scrollytelling",
    title: "Accessible scrollytelling",
    category: "Accessibility",
    summary: "Meeting WCAG 2.2 AA without giving up the cinematic feel.",
  },
  {
    slug: "measuring-attention",
    title: "Measuring attention",
    category: "Analytics",
    summary: "Reading scroll depth and section reach without fooling yourself.",
  },
  {
    slug: "from-document-to-story",
    title: "From document to story",
    category: "Workflow",
    summary: "Turning a PDF, proposal or report into a page people finish.",
  },
  {
    slug: "choosing-a-template",
    title: "Choosing a template",
    category: "Workflow",
    summary: "Matching story type to structure, and when to start blank.",
  },
];

export default function GuidesPage() {
  return (
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            eyebrow="Guides"
            title="Notes from the studio"
            lede="Short, practical pieces on the craft and mechanics of scroll-driven storytelling."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <article key={g.slug} className="flex flex-col rounded-xl border border-line bg-paper-raised p-6">
                <Badge tone="neutral" className="mb-4 self-start">
                  {g.category}
                </Badge>
                <h2 className="font-display text-xl">{g.title}</h2>
                <p className="mt-2 flex-1 text-sm text-ink-soft">{g.summary}</p>
                <Link
                  href={`/guides#${g.slug}`}
                  className="mt-5 text-sm font-medium text-accent underline underline-offset-2"
                >
                  Read the guide
                </Link>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-narrow py-16">
          <article id="accessible-scrollytelling">
            <h2 className="text-display text-3xl">Accessible scrollytelling</h2>
            <Prose className="mt-6">
              <p>
                Motion is a tool, not a requirement. A scroll story should be just as legible to someone
                navigating with a keyboard or a screen reader, or reading on a phone with reduced motion
                enabled, as it is to someone on a large display.
              </p>
              <h3>The rules we hold ourselves to</h3>
              <ul>
                <li>Never hijack the scrollbar. Animations respond to scroll; they do not replace it.</li>
                <li>Respect <code>prefers-reduced-motion</code> — and render content visible even if no animation ever runs.</li>
                <li>Give pinned layouts a stacked, static fallback on small screens.</li>
                <li>Keep focus visible on every interactive control, and keep every control reachable by keyboard.</li>
                <li>Reserve space for media so nothing shifts under the reader.</li>
                <li>Provide text alternatives for charts, and keep copyable text genuinely selectable.</li>
              </ul>
              <p>
                If a reader turns motion off, they lose decoration — never content.
              </p>
            </Prose>
          </article>
        </div>
      </Section>
    </>
  );
}
