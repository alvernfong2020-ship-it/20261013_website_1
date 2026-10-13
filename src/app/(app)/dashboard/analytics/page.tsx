import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsIndexPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryWorkspace(user.id);
  if (!membership) redirect("/onboarding");

  const stories = await prisma.story.findMany({
    where: { workspaceId: membership.workspaceId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      updatedAt: true,
      _count: { select: { events: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl">Analytics</h1>
      <p className="mt-1 text-sm text-ink-soft">Pick a story to inspect its engagement.</p>

      {stories.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No stories to analyse" description="Publish a story first, then visitors' aggregated activity appears here." />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <li key={s.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge tone={s.status === "PUBLISHED" ? "success" : "neutral"}>{s.status.toLowerCase()}</Badge>
                  <span className="text-xs text-ink-faint">{formatRelative(s.updatedAt)}</span>
                </div>
                <h2 className="mt-3 flex-1 font-display text-lg">{s.title}</h2>
                <p className="mt-1 text-xs text-ink-faint">{s._count.events} recorded events</p>
                <Link
                  href={`/dashboard/analytics/${s.id}`}
                  className="mt-3 text-sm text-accent underline underline-offset-2"
                >
                  View analytics →
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
