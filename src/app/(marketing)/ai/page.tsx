import type { Metadata } from "next";
import { Section, SectionHeader, FeatureGrid, Prose } from "@/components/marketing/blocks";
import { Alert, ButtonLink, Badge } from "@/components/ui/primitives";
import { providerStatus } from "@/lib/ai/provider";

export const metadata: Metadata = {
  title: "AI creation",
  description:
    "How Scrollwright's AI-assisted story generation works: a swappable provider adapter, an explicit ten-step pipeline, schema validation and a clearly labelled demo mode.",
  alternates: { canonical: "/ai" },
};

export const dynamic = "force-dynamic";

export default function AiPage() {
  const status = providerStatus();

  return (
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            eyebrow="AI creation"
            title="Drafting, not magic tricks"
            lede="The AI layer is a server-side adapter behind a stable interface. It plans structure and writes first-draft copy — and it tells you honestly when it is running in demo mode."
          />
          <div className="mt-6">
            <Badge tone={status.configured ? "success" : "warning"}>
              {status.configured
                ? `Live provider: ${status.provider} · ${status.model}`
                : "Demo mode — no model provider configured"}
            </Badge>
          </div>
          {!status.configured && (
            <div className="mt-6 max-w-2xl">
              <Alert tone="warning" title="This environment has no model provider connected">
                {status.notice} Generation requests return a clearly labelled demo result. Configure the
                provider environment variables to enable live generation.
              </Alert>
            </div>
          )}
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-wide grid gap-12 py-16 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h2 className="font-display text-3xl">What you can give it</h2>
            <Prose className="mt-5">
              <ul>
                <li>Natural-language instructions describing the story you want.</li>
                <li>Existing written content, pasted directly.</li>
                <li>Uploaded images to place in visual sections.</li>
                <li>Supported documents (PDF, text, Markdown, Word, JSON).</li>
                <li>Supported public URLs, fetched server-side with SSRF protections.</li>
                <li>Optional brand guidelines, target audience, tone and visual style.</li>
              </ul>
              <p>
                Everything is <strong>normalised</strong> into a single clean source before planning, so
                the outline is grounded in what you actually provided.
              </p>
            </Prose>
          </div>
          <div>
            <h2 className="font-display text-3xl">What it will not do</h2>
            <Prose className="mt-5">
              <ul>
                <li>Pretend a generation succeeded when no provider is configured.</li>
                <li>Execute generated JavaScript or render unsanitised HTML.</li>
                <li>Honour unknown component types or malformed URLs.</li>
                <li>Charge you for a job it did not complete.</li>
              </ul>
            </Prose>
          </div>
        </div>
      </Section>

      <Section>
        <div className="container-wide py-16">
          <SectionHeader eyebrow="Under the hood" title="Built to be swapped" />
          <FeatureGrid
            columns={3}
            items={[
              { title: "Provider adapter", body: "A single interface. Implementations can be replaced without touching product code, and API keys never reach the browser." },
              { title: "Prompt templates", body: "Versioned system and user prompts that produce the structured JSON contract the renderer expects." },
              { title: "Schema gate", body: "Every generated object is validated before it is saved or rendered. Invalid output is rejected with a clear error." },
            ]}
          />
          <div className="mt-10">
            <ButtonLink href="/sign-up">Try generation</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
