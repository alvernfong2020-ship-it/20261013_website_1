import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getOptionalUser, getPrimaryWorkspace } from "@/lib/auth/authorize";
import { getStoryForWorkspace, readDocument } from "@/lib/story/service";
import { EditorClient } from "@/components/editor/EditorClient";

export const metadata: Metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
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
    <EditorClient
      storyId={story.id}
      initialDocument={document}
      initialRevision={story.revision}
      storyStatus={story.status}
    />
  );
}
