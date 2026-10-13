import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getStoryForWorkspace, readDocument, saveDraft } from "@/lib/story/service";
import { parseStoryDocument } from "@/lib/story/schema";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/stories/[id] — full story incl. parsed document. */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "VIEWER");
  const story = await getStoryForWorkspace(id, ctx.workspace.id);
  const document = readDocument(story.document);
  return NextResponse.json({ story, document });
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  document: z.unknown().optional(),
  slug: z.string().max(80).optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  status: z.enum(["DRAFT", "ARCHIVED"]).optional(),
});

/** PATCH /api/stories/[id] — update metadata and/or the document. */
export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  await getStoryForWorkspace(id, ctx.workspace.id);
  const body = patchSchema.parse(await req.json());

  let story;
  if (body.document !== undefined) {
    const parsed = parseStoryDocument(body.document);
    if (!parsed.ok) {
      throw new HttpError(422, `Story validation failed: ${parsed.errors.slice(0, 3).join("; ")}`, "invalid_document");
    }
    if (body.slug) parsed.value.slug = body.slug;
    if (body.title) parsed.value.title = body.title;
    if (body.description !== undefined) parsed.value.description = body.description;
    story = await saveDraft({
      storyId: id,
      workspaceId: ctx.workspace.id,
      document: parsed.value,
      title: body.title,
      description: body.description,
      expectedRevision: body.expectedRevision,
    });
  } else {
    story = await prisma.story.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.title || body.description ? { revision: { increment: 1 } } : {}),
      },
    });
  }

  await audit(ctx.workspace.id, ctx.userId, "story.update", id, { fields: Object.keys(body) });
  return NextResponse.json({ story });
});

/** DELETE /api/stories/[id] — soft delete. */
export const DELETE = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  await getStoryForWorkspace(id, ctx.workspace.id);
  await prisma.story.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit(ctx.workspace.id, ctx.userId, "story.delete", id);
  return NextResponse.json({ ok: true });
});
