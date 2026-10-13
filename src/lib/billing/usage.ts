import { prisma } from "@/lib/db";
import { entitlementsFor, type Entitlements } from "@/lib/plans";
import { HttpError } from "@/lib/auth/authorize";
import type { Plan } from "@prisma/client";

export type UsageSummary = {
  plan: Plan;
  entitlements: Entitlements;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
  publishedCount: number;
  publishedLimit: number;
  formSubmissionsUsed: number;
  formSubmissionsLimit: number;
  periodStart: Date;
};

function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Aggregated usage for a workspace in the current billing period. */
export async function getUsage(workspaceId: string, plan: Plan): Promise<UsageSummary> {
  const periodStart = startOfMonth();
  const ent = entitlementsFor(plan);

  const [aiAgg, publishedCount, formCount] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: { workspaceId, kind: "ai_generation", createdAt: { gte: periodStart } },
      _sum: { amount: true },
    }),
    prisma.story.count({ where: { workspaceId, status: "PUBLISHED", deletedAt: null } }),
    prisma.formSubmission.count({ where: { workspaceId }, }),
  ]);

  return {
    plan,
    entitlements: ent,
    aiCreditsUsed: aiAgg._sum.amount ?? 0,
    aiCreditsLimit: ent.aiCredits,
    publishedCount,
    publishedLimit: ent.publishedStories,
    formSubmissionsUsed: formCount,
    formSubmissionsLimit: ent.formSubmissionsPerMonth,
    periodStart,
  };
}

/** Throws when a workspace has exhausted its AI credit allowance. */
export async function assertAiCreditsAvailable(workspaceId: string, plan: Plan, cost: number) {
  const usage = await getUsage(workspaceId, plan);
  const remaining = usage.aiCreditsLimit - usage.aiCreditsUsed;
  if (remaining < cost) {
    throw new HttpError(
      402,
      `This workspace has ${Math.max(remaining, 0)} AI credits left this month but the request needs ${cost}. Upgrade the plan or wait for the next period.`,
      "insufficient_credits",
    );
  }
}

export async function assertPublishAllowance(workspaceId: string, plan: Plan) {
  const ent = entitlementsFor(plan);
  if (ent.publishedStories === Infinity) return;
  const count = await prisma.story.count({
    where: { workspaceId, status: "PUBLISHED", deletedAt: null },
  });
  if (count >= ent.publishedStories) {
    throw new HttpError(
      402,
      `The ${ent.publishedStories}-story limit for this plan is reached. Unpublish a story or upgrade to publish more.`,
      "published_limit_reached",
    );
  }
}

export async function recordAiUsage(
  workspaceId: string,
  cost: number,
  jobId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.usageRecord.create({
    data: { workspaceId, kind: "ai_generation", amount: cost, jobId, metadata: metadata as object },
  });
}

export async function recordUsage(
  workspaceId: string,
  kind: string,
  amount = 1,
  metadata?: Record<string, unknown>,
) {
  await prisma.usageRecord.create({
    data: { workspaceId, kind, amount, metadata: metadata as object },
  });
}
