import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublishedDocument } from "@/lib/story/service";
import { StoryRenderer } from "@/components/story/StoryRenderer";
import { StoryAnalytics } from "@/components/story/StoryAnalytics";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const story = await prisma.story.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: { id: true },
  });
  if (!story) return null;
  return getPublishedDocument(story.id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Story not found", robots: { index: false } };

  const { story, document: doc } = data;
  const title = doc.seo.title || doc.title || story.title;
  const description = doc.seo.description || doc.description || "";
  const firstImage = doc.sections.flatMap((s) => s.media).find((m) => m.url)?.url;

  return {
    title,
    description,
    keywords: doc.seo.keywords,
    alternates: { canonical: `/s/${story.slug}` },
    robots: doc.seo.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(`/s/${story.slug}`),
      images: firstImage ? [{ url: firstImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: firstImage ? [firstImage] : undefined,
    },
  };
}

export default async function PublicStoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();

  const { story, document: doc, versionNumber } = data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: doc.title,
    description: doc.description,
    datePublished: story.createdAt.toISOString(),
    dateModified: story.updatedAt.toISOString(),
    version: versionNumber,
    author: { "@type": "Organization", name: "Scrollwright" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data is built from validated fields, then JSON.stringify
        // escapes it safely; no user HTML is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <StoryRenderer document={doc} mode="published" />
      <StoryAnalytics slug={story.slug} sections={doc.sections.map((s) => s.id)} />
    </>
  );
}
