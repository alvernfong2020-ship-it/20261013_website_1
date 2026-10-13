import { TEMPLATE_SEEDS } from "@/lib/templates/catalog";
import type { StoryDocument } from "@/lib/story/schema";

/**
 * Marketing "examples" derived from the template catalog.
 *
 * Each example is a real, valid story document. They are rendered by the
 * production engine and are served at /s/[slug] as seeded published content.
 */

export type Example = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  document: StoryDocument;
  thumbnail: string;
};

const PREFERRED = ["brand-story", "product-launch", "case-study", "data-story", "annual-report", "magazine-feature"];

export const EXAMPLE_STORIES: Example[] = PREFERRED.map((slug) => {
  const tpl = TEMPLATE_SEEDS.find((t) => t.slug === slug)!;
  return {
    slug: `${slug}-demo`,
    title: tpl.title,
    description: tpl.description,
    category: tpl.category,
    tags: tpl.tags,
    document: { ...tpl.document, slug: `${slug}-demo` },
    thumbnail: `/api/templates/${slug}/thumbnail`,
  };
}).filter(Boolean);
