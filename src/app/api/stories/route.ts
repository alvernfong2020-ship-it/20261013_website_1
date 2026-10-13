import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getUsage } from "@/lib/billing/usage";
import { listStories, uniqueSlug } from "@/lib/story/service";
import { createEmptyStory } from "@/lib/story/factory";
import { parseStoryDocument } from "@/lib/story/schema";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).default("Untitled story"),
  templateId: z.string().optional(),
  templateSlug: z.string().optional(),
  storyType: z.string().optional(),
  description: z.string().max(500).optional(),
});

/** GET /api/stories — list workspace stories with optional filters. */
export const GET = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "VIEWER");
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "DRAFT" || statusParam === "PUBLISHED" || statusParam === "ARCHIVED"
      ? statusParam
      : undefined;
  const q = url.searchParams.get("q") || undefined;

  const [stories, usage] = await Promise.all([
    listStories(ctx.workspace.id, { status, q }),
    getUsage(ctx.workspace.id, ctx.workspace.plan),
  ]);

  return NextResponse.json({ stories, usage });
});

/** POST /api/stories — create a draft (blank or from a template). */
export const POST = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "EDITOR");
  const body = createSchema.parse(await req.json());

  let document;
  let templateId: string | undefined;

  if (body.templateId || body.templateSlug) {
    const tpl = await prisma.template.findFirst({
      where: body.templateId ? { id: body.templateId } : { slug: body.templateSlug! },
    });
    if (!tpl) throw new HttpError(404, "Template not found.", "no_template");
    const parsed = parseStoryDocument(tpl.document);
    if (!parsed.ok) throw new HttpError(500, "That template contains invalid data.", "bad_template");
    document = structuredClone(parsed.value);
    templateId = tpl.id;
    document.title = body.title === "Untitled story" ? tpl.title : body.title;
    document.slug = await uniqueSlug(ctx.workspace.id, `${tpl.slug}-${document.title}`);
  } else {
    const blank = createEmptyStory({
      title: body.title,
      storyType: body.storyType || "ONE_PAGE",
      description: body.description || "",
    });
    blank.slug = await uniqueSlug(ctx.workspace.id, body.title);
    document = blank;
  }

  const validated = parseStoryDocument(document);
  if (!validated.ok) throw new HttpError(500, "The new story failed validation.", "invalid_document");

  const story = await prisma.story.create({
    data: {
      workspaceId: ctx.workspace.id,
      authorId: ctx.userId,
      title: validated.value.title,
      slug: validated.value.slug,
      description: validated.value.description,
      storyType: (body.storyType as never) || "ONE_PAGE",
      status: "DRAFT",
      document: validated.value as object,
      seo: validated.value.seo as object,
      theme: validated.value.theme,
      templateId: templateId ?? null,
    },
  });

  await audit(ctx.workspace.id, ctx.userId, "story.create", story.id, { title: story.title });
  return NextResponse.json({ story }, { status: 201 });
});

