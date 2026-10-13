import type { Metadata } from "next";
import { Section, Prose } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Scrollwright collects, uses and protects your data, including analytics and cookies.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Section>
      <div className="container-narrow py-16">
        <p className="eyebrow mb-3">Legal</p>
        <h1 className="text-display text-4xl">Privacy policy</h1>
        <p className="mt-4 text-sm text-ink-faint">Last updated: {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</p>

        <div className="mt-8 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-ink-soft">
          Demonstration documentation for an original product build — not legal advice. Review with a
          qualified professional before a commercial launch.
        </div>

        <Prose className="mt-10">
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Account data:</strong> your name, email address and a securely hashed password (or an
              OAuth identifier where you sign in with a provider).
            </li>
            <li>
              <strong>Your content:</strong> the stories, documents, URLs and assets you create or upload, and
              their versions.
            </li>
            <li>
              <strong>Usage data:</strong> generation jobs, credit consumption, publishing actions and audit
              logs for sensitive operations.
            </li>
            <li>
              <strong>Analytics data:</strong> first-party events from your published stories — page views,
              scroll depth, section reach, call-to-action clicks and form submissions.
            </li>
          </ul>

          <h2 id="cookies">Cookies and local storage</h2>
          <p>
            We use a single essential session cookie to keep you signed in. It is required for the Service to
            function and is not used for advertising. Published-story analytics use a random per-visit
            identifier stored in <code>sessionStorage</code> rather than a tracking cookie, so it is discarded
            when the tab closes and cannot follow a reader across sites.
          </p>

          <h2>Analytics and privacy</h2>
          <p>
            Our analytics are deliberately minimal and privacy-conscious:
          </p>
          <ul>
            <li>No third-party advertising scripts and no cross-site tracking.</li>
            <li>IP addresses are hashed with a server-side salt and never stored in the clear.</li>
            <li>Events are aggregated for reporting; repeated observer callbacks are deduplicated so counts are not inflated.</li>
            <li>Demonstration workspaces are explicitly labelled, and their data is generated, not real.</li>
          </ul>

          <h2>How we use data</h2>
          <ul>
            <li>To provide and secure the Service, including authentication and authorisation.</li>
            <li>To run AI generation jobs you request, and to account for their usage.</li>
            <li>To render, publish and measure your stories as you direct.</li>
            <li>To respond to your enquiries and provide support.</li>
          </ul>

          <h2>Third-party processors</h2>
          <p>
            When configured, we send data to the following categories of processor: an AI model provider (the
            prompt and normalised source for a generation request), an S3-compatible object store (uploaded
            media), a payment provider (billing metadata, never raw card data) and optionally a transactional
            email provider. Each is accessed through a server-side adapter, and provider API keys are never
            included in client bundles.
          </p>

          <h2>Data retention</h2>
          <p>
            We retain your content while your account is active. Deleting a story performs a soft delete that
            preserves it for recovery; workspace data is removed in line with your plan and applicable law.
            Analytics events are retained in aggregate.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on your jurisdiction you may have the right to access, correct, export or delete your
            personal data, and to object to certain processing. Contact us to exercise these rights.
          </p>

          <h2>Security</h2>
          <p>
            We apply server-side authorisation on every request, validate and sanitise input, verify webhook
            signatures, protect URL fetching against SSRF, and rate-limit sensitive endpoints. No system is
            perfectly secure; please use a strong, unique password.
          </p>

          <h2>Contact</h2>
          <p>Questions about privacy can be sent to privacy@scrollwright.example.</p>
        </Prose>
      </div>
    </Section>
  );
}
