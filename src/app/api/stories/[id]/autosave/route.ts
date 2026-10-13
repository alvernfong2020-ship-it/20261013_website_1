import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { saveDraft } from "@/lib/story/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  document: z.unknown(),
  revision: z.number().int().nonnegative(),
  title: z.string().max(200).optional(),
});

/**
 * POST /api/stories/[id]/autosave
 *
 * Debounced client-side autosave. Uses optimistic concurrency: if the stored
 * revision is newer than the one the client sent, a 409 is returned so the
 * editor can surface a conflict instead of silently losing work.
 */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  const body = schema.parse(await req.json());

  const story = await saveDraft({
    storyId: id,
    workspaceId: ctx.workspace.id,
    document: body.document as never,
    title: body.title,
    expectedRevision: body.revision,
  });

  return NextResponse.json({ revision: story.revision, updatedAt: story.updatedAt });
});
