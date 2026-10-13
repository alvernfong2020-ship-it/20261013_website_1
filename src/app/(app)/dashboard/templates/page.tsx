import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { TemplateBrowser, type TemplateCard as Card } from "@/components/marketing/TemplateBrowser";

export const metadata: Metadata = { title: "Templates" };
export const dynamic = "force-dynamic";

/** In-studio template browser — same data as the marketing library, but acts on your workspace. */
export default async function DashboardTemplatesPage() {
  const rows = await prisma.template.findMany({
    where: { isSystem: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
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
    },
  });
  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();

  const items: Card[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    storyType: r.storyType,
    tags: r.tags,
    thumbnail: r.thumbnail ?? `/api/templates/${r.slug}/thumbnail`,
    version: r.version,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl">Templates</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Duplicate any template into a new draft in this workspace. The original is never modified.
      </p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <TemplateBrowser items={items} categories={categories} signedIn />
        </Suspense>
      </div>
    </div>
  );
}
