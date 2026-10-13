import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { publishStory } from "@/lib/story/service";
import { assertPublishAllowance } from "@/lib/billing/usage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/stories/[id]/publish
 * Freezes the current draft into a new StoryVersion and marks the story live.
 * The published version is immutable, so editing the draft afterwards cannot
 * corrupt what visitors see.
 */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  await assertPublishAllowance(ctx.workspace.id, ctx.workspace.plan);
  const { story, version } = await publishStory(id, ctx.workspace.id, ctx.userId);
  await audit(ctx.workspace.id, ctx.userId, "story.publish", id, { version: version.version });
  return NextResponse.json({ story, version: version.version });
});
