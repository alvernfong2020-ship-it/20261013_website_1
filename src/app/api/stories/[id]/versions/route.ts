import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getStoryForWorkspace } from "@/lib/story/service";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/stories/[id]/versions — version history. */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "VIEWER");
  const story = await getStoryForWorkspace(id, ctx.workspace.id);
  const versions = await prisma.storyVersion.findMany({
    where: { storyId: story.id },
    orderBy: { version: "desc" },
    select: { id: true, version: true, title: true, publishedAt: true, createdBy: true },
  });
  return NextResponse.json({ versions, publishedVersionId: story.publishedVersionId });
});

/** POST /api/stories/[id]/versions — restore an earlier version into the draft. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  const story = await getStoryForWorkspace(id, ctx.workspace.id);
  const body = (await req.json()) as { versionId?: string; version?: number };
  if (!body.versionId && body.version === undefined) {
    throw new HttpError(422, "Specify which version to restore.", "missing_version");
  }

  const version = await prisma.storyVersion.findFirst({
    where: body.versionId
      ? { id: body.versionId, storyId: story.id }
      : { storyId: story.id, version: body.version },
  });
  if (!version) throw new HttpError(404, "Version not found.", "not_found");

  // Restoring writes the old document back into the editable draft; the
  // currently published version is left untouched.
  const updated = await prisma.story.update({
    where: { id: story.id },
    data: {
      document: version.document as object,
      title: version.title,
      description: version.description,
      seo: version.seo as object,
      revision: { increment: 1 },
    },
  });

  await audit(ctx.workspace.id, ctx.userId, "story.restore", id, { version: version.version });
  return NextResponse.json({ story: updated, restoredFrom: version.version });
});
