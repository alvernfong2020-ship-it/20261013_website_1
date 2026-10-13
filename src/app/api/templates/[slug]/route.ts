import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseStoryDocument } from "@/lib/story/schema";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** GET /api/templates/[slug] — full template (accepts a slug or an id). */
export const GET = handler(async (_req: Request, { params }: Params) => {
  const { slug } = await params;
  const template = await prisma.template.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
  });
  if (!template) throw new HttpError(404, "Template not found.", "not_found");

  const parsed = parseStoryDocument(template.document);
  if (!parsed.ok) throw new HttpError(500, "That template contains invalid data.", "bad_template");

  return NextResponse.json({
    template: {
      id: template.id,
      slug: template.slug,
      title: template.title,
      description: template.description,
      category: template.category,
      storyType: template.storyType,
      tags: template.tags,
      version: template.version,
      document: parsed.value,
    },
  });
});
