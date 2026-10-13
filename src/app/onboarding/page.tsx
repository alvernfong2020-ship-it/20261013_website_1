import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/authorize";
import { OnboardingWizard } from "@/components/app/OnboardingWizard";

export const metadata: Metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();
  return (
    <Suspense fallback={null}>
      <OnboardingWizard initialName={user.name || user.email.split("@")[0]} />
    </Suspense>
  );
}
