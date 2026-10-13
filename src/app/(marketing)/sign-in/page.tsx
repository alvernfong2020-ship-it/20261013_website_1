import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/authorize";
import { oauthGoogleEnabled } from "@/lib/auth";
import { SignInForm } from "@/components/marketing/SignInForm";
import { Section } from "@/components/marketing/blocks";

export const metadata: Metadata = { title: "Sign in", alternates: { canonical: "/sign-in" } };

export default async function SignInPage() {
  const user = await getOptionalUser().catch(() => null);
  if (user) redirect("/dashboard");

  return (
    <Section>
      <div className="container-wide flex justify-center py-16">
        <Suspense fallback={null}>
          <SignInForm googleEnabled={oauthGoogleEnabled()} />
        </Suspense>
      </div>
    </Section>
  );
}
