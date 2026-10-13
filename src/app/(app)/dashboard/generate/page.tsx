import type { Metadata } from "next";
import { Suspense } from "react";
import { providerStatus } from "@/lib/ai/provider";
import { GenerationWizard } from "@/components/app/GenerationWizard";
import { TEMPLATE_SEEDS } from "@/lib/templates/catalog";

export const metadata: Metadata = { title: "Create with AI" };
export const dynamic = "force-dynamic";

export default function GeneratePage() {
  const status = providerStatus();
  return (
    <Suspense fallback={null}>
      <GenerationWizard
        aiStatus={{
          configured: status.configured,
          provider: status.provider,
          model: status.model,
          notice: status.notice,
        }}
        templates={TEMPLATE_SEEDS.slice(0, 6).map((t) => ({ slug: t.slug, title: t.title }))}
      />
    </Suspense>
  );
}
