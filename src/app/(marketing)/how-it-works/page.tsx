import type { Metadata } from "next";
import { Section, SectionHeader, StepList, Prose } from "@/components/marketing/blocks";
import { ButtonLink, Card } from "@/components/ui/primitives";
import { ProductDemo } from "@/components/marketing/ProductDemo";
import { Accordion } from "@/components/marketing/Accordion";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Scrollwright turns a prompt, document or URL into a publishable scroll-driven story — from ingestion and AI planning to the visual editor and publishing.",
  alternates: { canonical: "/how-it-works" },
};

const STAGES = [
  {
    n: "01",
    title: "Describe or import",
    body: "Write a prompt, paste copy, upload a document or supply a URL. The importer validates the source and normalises it into clean, editable text.",
  },
  {
    n: "02",
    title: "Refine in the editor",
    body: "A structured narrative outline is generated, then rendered into sections. Reorder, rewrite inline, swap imagery and tune animation — with undo, autosave and version history.",
  },
  {
    n: "03",
    title: "Publish and measure",
    body: "Publishing freezes an immutable version at a public URL. First-party analytics then report scroll depth, section reach and call-to-action clicks.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            eyebrow="How it works"
            title="From raw input to a finished story"
            lede="Ten explicit steps, each with a visible progress state, a schema validation gate and a clear failure path. Nothing is hidden and nothing is faked."
          />
          <StepList steps={STAGES} />
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-wide grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl">The generation pipeline</h2>
            <Prose className="mt-5">
              <ol className="list-decimal space-y-2 pl-5">
                <li>Validate the input (length, type, safety).</li>
                <li>Create a tracked generation job.</li>
                <li>Extract and normalise supported source content.</li>
                <li>Produce a structured narrative outline.</li>
                <li>Generate a section-by-section content plan.</li>
                <li>Select suitable layout patterns.</li>
                <li>Retrieve or generate suitable visual assets.</li>
                <li>Define animation and interaction settings.</li>
                <li>Validate the story against the schema.</li>
                <li>Save a draft and open it in the editor.</li>
              </ol>
              <p>
                Progress is reported as <strong>Preparing content</strong>, <strong>Planning story</strong>,{" "}
                <strong>Generating sections</strong>, <strong>Preparing visuals</strong> and{" "}
                <strong>Saving draft</strong>. Recoverable failures offer a retry; unrecoverable ones
                explain what went wrong.
              </p>
            </Prose>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-line px-5 py-3">
              <p className="eyebrow">Progress</p>
            </div>
            <ul className="divide-y divide-line">
              {[
                ["Preparing content", "Extracted 2,418 characters", "done"],
                ["Planning story", "Outline with 6 sections", "done"],
                ["Generating sections", "Hero, statistics, rich text…", "active"],
                ["Preparing visuals", "Waiting", "pending"],
                ["Saving draft", "Waiting", "pending"],
              ].map(([step, detail, state]) => (
                <li key={step} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                  <span
                    aria-hidden="true"
                    className={
                      "grid h-5 w-5 place-items-center rounded-full text-[10px] " +
                      (state === "done"
                        ? "bg-success/15 text-success"
                        : state === "active"
                          ? "bg-accent text-accent-contrast"
                          : "bg-paper-sunken text-ink-faint")
                    }
                  >
                    {state === "done" ? "✓" : state === "active" ? "•" : ""}
                  </span>
                  <span className="flex-1 font-medium">{step}</span>
                  <span className="text-ink-faint">{detail}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="container-wide py-16">
          <SectionHeader eyebrow="Try it" title="The editor, live" lede="The demonstration below is the real application, not a recording." />
          <div className="mt-10">
            <ProductDemo />
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/sign-up">Start creating</ButtonLink>
            <ButtonLink href="/examples" variant="secondary">
              See examples
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-wide grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Details" title="How it behaves" />
          <Accordion
            items={[
              {
                question: "What happens when no AI provider is configured?",
                answer:
                  "The generation call returns a clearly labelled demo result and the interface shows a configuration notice. The app never pretends a live model produced the content.",
              },
              {
                question: "How is the output kept safe?",
                answer:
                  "Generated stories are validated against a strict schema before rendering. Unknown component types, unsafe markup, malformed URLs and invalid animation settings are rejected. Generated JavaScript is never executed — a component registry maps known section types to trusted React components.",
              },
              {
                question: "Will it hijack my scroll?",
                answer:
                  "No. Animations are driven by scroll position or viewport entry, never by taking over the scrollbar. Pinned sections degrade to a stacked layout on mobile and under prefers-reduced-motion.",
              },
            ]}
          />
        </div>
      </Section>
    </>
  );
}
