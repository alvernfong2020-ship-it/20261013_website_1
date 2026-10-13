import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getStoryForWorkspace, uniqueSlug } from "@/lib/story/service";
import { parseStoryDocument } from "@/lib/story/schema";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/stories/[id]/duplicate — copy a story (or its current draft) as a new draft. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  const source = await getStoryForWorkspace(id, ctx.workspace.id);

  const parsed = parseStoryDocument(source.document);
  if (!parsed.ok) throw new HttpError(500, "The source story contains invalid data.", "bad_source");

  const document = structuredClone(parsed.value);
  document.id = `story_${Date.now().toString(36)}`;
  document.title = `${source.title} (copy)`.slice(0, 200);
  document.slug = await uniqueSlug(ctx.workspace.id, document.title);

  const story = await prisma.story.create({
    data: {
      workspaceId: ctx.workspace.id,
      authorId: ctx.userId,
      title: document.title,
      slug: document.slug,
      description: source.description,
      storyType: source.storyType,
      status: "DRAFT",
      document: document as object,
      seo: document.seo as object,
      theme: document.theme,
    },
  });

  await audit(ctx.workspace.id, ctx.userId, "story.duplicate", story.id, { from: id });
  return NextResponse.json({ story }, { status: 201 });
});
