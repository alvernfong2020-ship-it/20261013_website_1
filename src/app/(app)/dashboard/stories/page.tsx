import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui/primitives";
import { formatRelative } from "@/lib/utils";
import { STORY_TYPE_LABELS } from "@/lib/ai/contract";

export const metadata: Metadata = { title: "Stories" };
export const dynamic = "force-dynamic";

export default async function StoriesPage() {
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
      storyType: true,
      updatedAt: true,
      _count: { select: { versions: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">All stories</h1>
          <p className="mt-1 text-sm text-ink-soft">{stories.length} in this workspace</p>
        </div>
        <ButtonLink href="/dashboard/generate" variant="secondary">
          New story
        </ButtonLink>
      </header>

      {stories.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No stories yet"
            description="Create your first story from a template or a description."
            action={<ButtonLink href="/dashboard">Go to dashboard</ButtonLink>}
          />
        </div>
      ) : (
        <Card className="mt-8 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Your stories</caption>
              <thead className="bg-paper-sunken text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Title</th>
                  <th scope="col" className="px-4 py-3 font-medium">Type</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Updated</th>
                  <th scope="col" className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link href={`/editor/${s.id}`} className="hover:text-accent">
                        {s.title}
                      </Link>
                    </th>
                    <td className="px-4 py-3 text-ink-soft">{STORY_TYPE_LABELS[s.storyType] ?? "Story"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={s.status === "PUBLISHED" ? "success" : s.status === "ARCHIVED" ? "warning" : "neutral"}>
                        {s.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatRelative(s.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/editor/${s.id}`} className="text-accent underline underline-offset-2">
                          Edit
                        </Link>
                        <Link href={`/dashboard/analytics/${s.id}`} className="text-ink-soft hover:text-ink">
                          Analytics
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
