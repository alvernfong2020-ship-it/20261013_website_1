import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { getStoryForWorkspace, readDocument } from "@/lib/story/service";
import { summarize } from "@/lib/analytics";
import { AnalyticsDashboard } from "@/components/app/AnalyticsDashboard";

export const metadata: Metadata = { title: "Story analytics" };
export const dynamic = "force-dynamic";

export default async function StoryAnalyticsPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryWorkspace(user.id);
  if (!membership) redirect("/onboarding");

  let story;
  try {
    story = await getStoryForWorkspace(storyId, membership.workspaceId);
  } catch {
    notFound();
  }

  const document = readDocument(story.document);
  const summary = await summarize(story.id, 30);
  const sectionLabels = Object.fromEntries(
    document.sections.map((s) => [s.id, s.heading || s.eyebrow || s.type.replace(/-/g, " ")]),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AnalyticsDashboard
        storyId={story.id}
        storyTitle={story.title}
        sectionLabels={sectionLabels}
        initialSummary={summary}
      />
    </div>
  );
}
