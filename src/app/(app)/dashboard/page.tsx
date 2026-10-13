import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { getUsage } from "@/lib/billing/usage";
import { DashboardClient, type StoryListItem } from "@/components/app/DashboardClient";
import { TEMPLATE_SEEDS } from "@/lib/templates/catalog";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");

  // New users are nudged through onboarding once.
  if (!user.onboardedAt) redirect("/onboarding");

  const membership = await getPrimaryWorkspace(user.id);
  if (!membership) redirect("/onboarding");

  const wsId = membership.workspaceId;
  const [stories, usage, recentActivity] = await Promise.all([
    prisma.story.findMany({
      where: { workspaceId: wsId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        storyType: true,
        updatedAt: true,
        revision: true,
        _count: { select: { versions: true } },
      },
    }),
    getUsage(wsId, membership.workspace.plan),
    prisma.auditLog.findMany({
      where: { workspaceId: wsId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, createdAt: true },
    }),
  ]);

  const items: StoryListItem[] = stories.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    status: s.status,
    storyType: s.storyType,
    updatedAt: s.updatedAt.toISOString(),
    publishedAt: null,
    versions: s._count.versions,
  }));

  return (
    <DashboardClient
      stories={items}
      usage={{
        plan: usage.plan,
        aiCreditsUsed: usage.aiCreditsUsed,
        aiCreditsLimit: usage.aiCreditsLimit,
        publishedCount: usage.publishedCount,
        publishedLimit: usage.publishedLimit,
      }}
      activity={recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        createdAt: a.createdAt.toISOString(),
      }))}
      suggestedTemplates={TEMPLATE_SEEDS.slice(0, 3).map((t) => ({
        slug: t.slug,
        title: t.title,
        category: t.category,
      }))}
    />
  );
}
