import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/marketing/ForgotPasswordForm";
import { Section } from "@/components/marketing/blocks";

export const metadata: Metadata = { title: "Forgot password", alternates: { canonical: "/forgot-password" } };

export default function ForgotPasswordPage() {
  return (
    <Section>
      <div className="container-wide flex justify-center py-16">
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </Section>
  );
}
