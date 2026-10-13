import type { Metadata } from "next";
import { Section, Prose } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms governing your use of the Scrollwright platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Section>
      <div className="container-narrow py-16">
        <p className="eyebrow mb-3">Legal</p>
        <h1 className="text-display text-4xl">Terms of service</h1>
        <p className="mt-4 text-sm text-ink-faint">Last updated: {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</p>

        <div className="mt-8 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-ink-soft">
          This is demonstration documentation for an original product build. It is not legal advice, and it
          has not been reviewed by a lawyer. Replace it with terms appropriate to your jurisdiction before
          any commercial launch.
        </div>

        <Prose className="mt-10">
          <h2>1. Agreement</h2>
          <p>
            These terms govern your access to and use of Scrollwright (&quot;the Service&quot;). By creating an
            account or using the Service you agree to these terms. If you do not agree, do not use the
            Service.
          </p>

          <h2>2. Accounts and workspaces</h2>
          <p>
            You are responsible for the security of your account credentials and for all activity under your
            account. Workspace owners control membership and roles. You must provide accurate information and
            promptly notify us of any unauthorised use.
          </p>

          <h2>3. Your content</h2>
          <p>
            You retain ownership of the stories, text, images and other content you create or upload
            (&quot;Your Content&quot;). You grant us a limited licence to host, store, process and display
            Your Content solely to operate the Service — for example, to render published stories and to
            generate media thumbnails.
          </p>

          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>upload unlawful content, or content you do not have the right to use;</li>
            <li>attempt to bypass usage limits, authorisation checks or rate limits;</li>
            <li>probe, scan or disrupt the Service or other users&apos; workspaces;</li>
            <li>use the Service to send spam or to distribute malware;</li>
            <li>use automated systems to import content in a way that burdens the Service.</li>
          </ul>

          <h2>5. AI-assisted features</h2>
          <p>
            AI generation produces draft material and may be inaccurate or incomplete. You are responsible
            for reviewing and editing generated content before publishing it. When no model provider is
            configured, generation runs in a clearly labelled demonstration mode and does not produce
            model-generated output.
          </p>

          <h2>6. Plans, credits and billing</h2>
          <p>
            Paid plans include a monthly allowance of AI credits and other entitlements, enforced
            server-side. Prices displayed in this build are illustrative. Where a payment provider is
            connected, billing is handled by that provider and subscriptions renew until cancelled. Where no
            provider is connected, plan changes apply only locally in a development mode.
          </p>

          <h2>7. Availability</h2>
          <p>
            The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not
            warrant uninterrupted operation, and we may modify or discontinue features.
          </p>

          <h2>8. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate access if you breach
            these terms or to protect the Service or other users. On termination we may retain data as
            required by law, and may delete workspace data in line with our privacy policy.
          </p>

          <h2>9. Liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for indirect, incidental or
            consequential damages, or for lost profits or data. Nothing in these terms excludes liability
            that cannot lawfully be excluded.
          </p>

          <h2>10. Changes</h2>
          <p>
            We may update these terms. Material changes will be communicated through the Service. Continued
            use after a change constitutes acceptance.
          </p>
        </Prose>
      </div>
    </Section>
  );
}
