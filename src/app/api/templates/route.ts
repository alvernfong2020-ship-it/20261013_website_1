import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/templates — public, searchable template discovery.
 * Query params: q, category, storyType, sort=recent|relevance, favouritesOnly
 */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";
  const storyType = url.searchParams.get("storyType")?.trim() ?? "";
  const sort = url.searchParams.get("sort") ?? "relevance";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60) || 60, 100);

  const templates = await prisma.template.findMany({
    where: {
      isSystem: true,
      ...(category ? { category } : {}),
      ...(storyType ? { storyType: storyType as never } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    orderBy: sort === "recent" ? { createdAt: "desc" } : [{ category: "asc" }, { title: "asc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      storyType: true,
      tags: true,
      thumbnail: true,
      version: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    templates,
    categories: TEMPLATE_CATEGORIES,
  });
});
