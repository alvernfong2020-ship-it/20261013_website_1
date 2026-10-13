import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/marketing/blocks";
import { TemplateBrowser, type TemplateCard } from "@/components/marketing/TemplateBrowser";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/catalog";
import { prisma } from "@/lib/db";
import { getOptionalUser } from "@/lib/auth/authorize";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Template library",
  description:
    "Browse original, fully editable starter templates for scroll-driven stories: About Us, portfolios, product launches, case studies, annual reports, data stories and more.",
  alternates: { canonical: "/templates" },
};

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [rows, user] = await Promise.all([
    prisma.template.findMany({
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
    }),
    getOptionalUser().catch(() => null),
  ]);

  const items: TemplateCard[] = rows.map((r) => ({
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
    <>
      <Section>
        <div className="container-wide py-16">
          <SectionHeader
            eyebrow="Templates"
            title="Start from a structure that already works"
            lede="Every template defines its own section order, typography, colour tokens, media placeholders, animation presets and responsive rules. Duplicate one into a new draft and make it yours."
            action={
              <ButtonLink href="/sign-up?blank=1" variant="secondary">
                Start with a blank canvas
              </ButtonLink>
            }
          />
          <div className="mt-12">
            <TemplateBrowser items={items} categories={[...TEMPLATE_CATEGORIES]} signedIn={Boolean(user)} />
          </div>
        </div>
      </Section>
    </>
  );
}
