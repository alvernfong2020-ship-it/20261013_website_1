import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/marketing/blocks";
import { PricingCards } from "@/components/marketing/PricingCards";
import { Accordion } from "@/components/marketing/Accordion";
import { Badge } from "@/components/ui/primitives";
import { billingMode } from "@/lib/billing/provider";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Example pricing for Scrollwright plans — Free, Starter, Pro and Pro+ — with AI credits, published stories, custom domains, team seats and form submissions.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const mode = billingMode();

  return (
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            align="center"
            eyebrow="Pricing"
            title="Simple plans, clearly labelled"
            lede="These are illustrative prices while commercial terms are finalised. Entitlements — credits, published stories, seats and limits — are enforced on the server, not in the browser."
          />
          <div className="mt-6 flex justify-center">
            <Badge tone={mode === "live" ? "success" : "warning"}>
              Billing mode: {mode === "live" ? "live (payment provider connected)" : "development (no payments taken)"}
            </Badge>
          </div>
          <div className="mt-10">
            <PricingCards />
          </div>
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-wide py-16">
          <SectionHeader eyebrow="Comparison" title="What each plan includes" />
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <caption className="sr-only">Plan feature comparison</caption>
              <thead>
                <tr className="border-b border-line-strong text-left">
                  <th scope="col" className="py-3 pr-4 font-medium">Feature</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Free</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Starter</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Pro</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Pro+</th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                {[
                  ["AI credits / month", "20", "200", "1,000", "5,000"],
                  ["Published stories", "1", "5", "25", "Unlimited"],
                  ["Custom domains", "—", "—", "1", "5"],
                  ["Team seats", "1", "1", "5", "20"],
                  ["Form submissions / month", "50", "500", "5,000", "50,000"],
                  ["Interactive components", "—", "✓", "✓", "✓"],
                  ["Remove footer badge", "—", "✓", "✓", "✓"],
                  ["Export to static bundle", "—", "—", "✓", "✓"],
                  ["Priority support", "—", "—", "✓", "Dedicated"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-line">
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="py-3 pr-4 font-medium text-ink">
                          {cell}
                        </th>
                      ) : (
                        <td key={i} className="py-3 pr-4">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section>
        <div className="container-wide grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Billing questions" title="Practical answers" />
          <Accordion
            items={[
              {
                question: "Is payment actually processed?",
                answer:
                  "Only when a payment provider is configured. Otherwise plan changes run in a clearly labelled development mode: they update your workspace plan locally so you can test entitlements, but no money moves.",
              },
              {
                question: "How are AI credits counted?",
                answer:
                  "Each generation job costs a fixed number of credits, deducted when the job is created and enforced server-side. If a job fails before producing a story, the failure is reported and the allowance is not silently consumed by a second invisible attempt.",
              },
              {
                question: "Can I change plans later?",
                answer:
                  "Yes. Upgrades and downgrades are handled through the billing portal. Webhook handlers are idempotent and verify signatures, so a repeated delivery will not double-apply a change.",
              },
              {
                question: "Do you store card details?",
                answer:
                  "Never. The application database stores only a provider reference for the subscription — raw card data stays with the payment provider.",
              },
            ]}
          />
        </div>
      </Section>
    </>
  );
}
