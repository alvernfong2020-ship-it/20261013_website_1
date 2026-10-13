import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/marketing/ResetPasswordForm";
import { Section } from "@/components/marketing/blocks";

export const metadata: Metadata = { title: "Reset password", alternates: { canonical: "/reset-password" } };

export default function ResetPasswordPage() {
  return (
    <Section>
      <div className="container-wide flex justify-center py-16">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </Section>
  );
}
