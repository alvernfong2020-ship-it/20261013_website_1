import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/marketing/blocks";
import { Accordion } from "@/components/marketing/Accordion";
import { FAQS_HOME } from "@/lib/marketing/content";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about AI generation, coding requirements, importing content, publishing, custom domains, analytics, usage limits, privacy and content ownership.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <Section>
        <div className="container-wide grid gap-12 py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <SectionHeader eyebrow="FAQ" title="Everything, plainly" />
            <p className="mt-4 text-sm text-ink-soft">
              Can&apos;t find it?{" "}
              <ButtonLink href="/contact" variant="ghost" size="sm" className="px-0">
                Contact us →
              </ButtonLink>
            </p>
          </div>
          <Accordion items={FAQS_HOME} />
        </div>
      </Section>
    </>
  );
}
