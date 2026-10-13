import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { getStoryForWorkspace, readDocument } from "@/lib/story/service";
import { StoryRenderer } from "@/components/story/StoryRenderer";
import { Badge, ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");
  const membership = await getPrimaryWorkspace(user.id);
  if (!membership) redirect("/onboarding");

  let story;
  try {
    story = await getStoryForWorkspace(id, membership.workspaceId);
  } catch {
    notFound();
  }
  const document = readDocument(story.document);

  return (
    <>
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-raised/95 px-4 py-2 text-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Badge tone="info">Preview</Badge>
          <span className="text-ink-soft">
            {story.title} — this is the draft, not the published version.
          </span>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/editor/${story.id}`} size="sm" variant="secondary">
            Back to editor
          </ButtonLink>
          {story.status === "PUBLISHED" && (
            <Link href={`/s/${story.slug}`} className="text-accent underline underline-offset-2">
              View live ↗
            </Link>
          )}
        </div>
      </div>
      <StoryRenderer document={document} mode="preview" />
    </>
  );
}
