import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { getUsage } from "@/lib/billing/usage";
import { billingMode } from "@/lib/billing/provider";
import { entitlementsFor } from "@/lib/plans";
import { BillingManager } from "@/components/app/BillingManager";
import type { PlanId } from "@/lib/plans";

export const metadata: Metadata = { title: "Billing & usage" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryWorkspace(user.id);
  if (!membership) redirect("/onboarding");

  const ws = membership.workspace;
  const [usage, subscription] = await Promise.all([
    getUsage(ws.id, ws.plan),
    prisma.subscription.findFirst({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const ent = entitlementsFor(ws.plan);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl">Billing &amp; usage</h1>
      <nav className="mt-4 flex gap-4 text-sm" aria-label="Settings sections">
        <Link href="/dashboard/settings" className="text-ink-soft hover:text-ink">
          Workspace
        </Link>
        <Link href="/dashboard/settings/billing" className="font-medium text-ink">
          Billing &amp; usage
        </Link>
      </nav>

      <div className="mt-8">
        <BillingManager
          mode={billingMode()}
          plan={ws.plan as PlanId}
          cycle={(subscription?.billingCycle as "monthly" | "yearly") || "monthly"}
          seats={ent.teamSeats}
          canManage={membership.role === "OWNER"}
          usage={{
            aiCreditsUsed: usage.aiCreditsUsed,
            aiCreditsLimit: usage.aiCreditsLimit,
            publishedCount: usage.publishedCount,
            publishedLimit: usage.publishedLimit,
            formSubmissionsUsed: usage.formSubmissionsUsed,
            formSubmissionsLimit: usage.formSubmissionsLimit,
          }}
          subscription={
            subscription
              ? {
                  status: subscription.status,
                  currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                  provider: subscription.provider,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
