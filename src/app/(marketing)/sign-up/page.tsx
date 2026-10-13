import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/authorize";
import { oauthGoogleEnabled } from "@/lib/auth";
import { SignUpForm } from "@/components/marketing/SignUpForm";
import { Section } from "@/components/marketing/blocks";

export const metadata: Metadata = { title: "Create an account", alternates: { canonical: "/sign-up" } };

export default async function SignUpPage() {
  const user = await getOptionalUser().catch(() => null);
  if (user) redirect("/dashboard");

  return (
    <Section>
      <div className="container-wide flex justify-center py-16">
        <Suspense fallback={null}>
          <SignUpForm googleEnabled={oauthGoogleEnabled()} />
        </Suspense>
      </div>
    </Section>
  );
}
