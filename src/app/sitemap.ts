import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** XML sitemap: static marketing routes plus every published story. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/examples",
    "/templates",
    "/how-it-works",
    "/pricing",
    "/faq",
    "/widgets",
    "/ai",
    "/integrations",
    "/guides",
    "/contact",
    "/terms",
    "/privacy",
  ].map((p) => ({
    url: absoluteUrl(p || "/"),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  let stories: MetadataRoute.Sitemap = [];
  try {
    const rows = await prisma.story.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        OR: [{ seo: { equals: Prisma.DbNull } }, { seo: { not: { path: ["noIndex"], equals: true } } }],
      },
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
    stories = rows.map((s) => ({
      url: absoluteUrl(`/s/${s.slug}`),
      lastModified: s.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    stories = [];
  }

  return [...staticRoutes, ...stories];
}
