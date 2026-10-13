import type { Metadata } from "next";
import { Section, SectionHeader, FeatureGrid } from "@/components/marketing/blocks";
import { Alert, ButtonLink, Badge } from "@/components/ui/primitives";
import { storageConfiguredForProduction } from "@/lib/storage";
import { billingMode } from "@/lib/billing/provider";
import { providerStatus } from "@/lib/ai/provider";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Scrollwright's provider interfaces — AI models, object storage, authentication, billing and analytics — and how each is configured or labelled as a demo.",
  alternates: { canonical: "/integrations" },
};

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  const storageLive = storageConfiguredForProduction();
  const billing = billingMode();
  const ai = providerStatus();

  const rows = [
    {
      name: "AI model provider",
      live: ai.configured,
      detail: ai.configured
        ? `Connected: ${ai.provider} (${ai.model}).`
        : "Not connected — generation runs in a labelled demo mode.",
      env: "AI_PROVIDER, AI_API_KEY, AI_MODEL",
    },
    {
      name: "Object storage",
      live: storageLive,
      detail: storageLive
        ? "S3-compatible storage is active for persistent media."
        : "Using local disk storage. Fine for development; configure S3-compatible storage for production.",
      env: "STORAGE_DRIVER, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
    },
    {
      name: "Authentication",
      live: true,
      detail: "Auth.js with credentials sign-in is always available. OAuth is enabled only when credentials exist.",
      env: "AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET",
    },
    {
      name: "Billing",
      live: billing === "live",
      detail:
        billing === "live"
          ? "A payment provider is connected and webhooks are verified."
          : "Development billing mode — plan changes apply locally and no payments are taken.",
      env: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*",
    },
    {
      name: "Analytics",
      live: true,
      detail: "First-party event collection runs in-app with no third-party scripts.",
      env: "None required",
    },
    {
      name: "Custom domains",
      live: false,
      detail: "DNS verification is real, but SSL provisioning and hosting require a hosting integration that is not configured here.",
      env: "HOSTING_PROVIDER, HOSTING_API_KEY",
    },
  ];

  return (
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            eyebrow="Integrations"
            title="Provider-agnostic by design"
            lede="Every external service sits behind an interface so vendors can be replaced later. This page reports exactly what is connected right now — no green ticks for services that are not there."
          />

          <div className="mt-12 overflow-hidden rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Integration status</caption>
              <thead className="bg-paper-sunken text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Integration</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Environment variables</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-t border-line align-top">
                    <th scope="row" className="px-4 py-4 text-left font-medium text-ink">
                      {r.name}
                      <p className="mt-1 font-normal text-ink-soft">{r.detail}</p>
                    </th>
                    <td className="px-4 py-4">
                      <Badge tone={r.live ? "success" : "warning"}>{r.live ? "Connected" : "Not configured"}</Badge>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-ink-soft">{r.env}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 max-w-2xl">
            <Alert tone="info" title="How to configure">
              Set the variables above in your environment, restart the server, and reload this page. Missing
              credentials never break the product: the affected feature shows an explicit notice instead.
            </Alert>
          </div>
        </div>
      </Section>

      <Section tone="sunken">
        <div className="container-wide py-16">
          <SectionHeader eyebrow="Interfaces" title="What each adapter guarantees" />
          <FeatureGrid
            columns={3}
            items={[
              { title: "AI", body: "A single generate() contract with structured output, timeouts and error surfacing." },
              { title: "Storage", body: "put / delete / urlFor — swappable between local disk and S3-compatible object storage." },
              { title: "Billing", body: "Checkout, portal and signed idempotent webhooks, with a development fallback." },
            ]}
          />
          <div className="mt-10">
            <ButtonLink href="/sign-up">Start building</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
