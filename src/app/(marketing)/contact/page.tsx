import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/marketing/blocks";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Scrollwright team about the product, partnerships, or support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Section>
      <div className="container-wide grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeader
            eyebrow="Contact"
            title="Talk to a human"
            lede="Questions about a plan, a template or a specific use case? Send us a note and we'll get back to you."
          />
          <dl className="mt-10 space-y-5 text-sm">
            <div>
              <dt className="eyebrow mb-1">Support</dt>
              <dd className="text-ink-soft">support@scrollwright.example</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Sales</dt>
              <dd className="text-ink-soft">sales@scrollwright.example</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Studio</dt>
              <dd className="text-ink-soft">Lisbon · Remote-first</dd>
            </div>
          </dl>
          <p className="mt-8 max-w-sm text-xs text-ink-faint">
            These addresses are illustrative for this demonstration product. Contact delivery is enabled
            only when a mail provider is configured.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-6 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </Section>
  );
}
