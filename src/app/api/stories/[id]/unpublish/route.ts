import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { unpublishStory } from "@/lib/story/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/stories/[id]/unpublish — returns the story to draft. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  const story = await unpublishStory(id, ctx.workspace.id);
  await audit(ctx.workspace.id, ctx.userId, "story.unpublish", id);
  return NextResponse.json({ story });
});
