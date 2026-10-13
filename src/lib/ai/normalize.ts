import { nanoid } from "nanoid";
import { slugify } from "@/lib/utils";
import {
  createEmptyStory,
  createSection,
  newId,
} from "@/lib/story/factory";
import type { StoryDocument, StorySection, SectionType } from "@/lib/story/schema";
import type { DraftStory, DraftSection } from "./contract";

/**
 * Converts a validated DraftStory (from the LLM or the demo generator) into a
 * full StoryDocument: sections, animation, layout, palette, SEO — all with
 * schema-safe defaults. Nothing the model returns is trusted beyond the fields
 * the draft schema allowed.
 */

function sectionFromDraft(draft: DraftSection): StorySection {
  const type = draft.type as SectionType;
  const base = createSection(type);

  const data: Record<string, unknown> = {};
  if (type === "statistics" && draft.stats) data.stats = draft.stats;
  if (type === "timeline" && draft.timeline) data.items = draft.timeline;
  if (type === "feature-showcase" && draft.features) data.items = draft.features;
  if (type === "faq" && draft.faq) data.items = draft.faq;
  if (type === "quote" && draft.quoteAttribution) data.attribution = draft.quoteAttribution;

  const animationByType: Partial<Record<SectionType, StorySection["animation"]>> = {
    hero: { preset: "fade-in", mode: "in-view", duration: 800, delay: 0, distance: 30 },
    "fullscreen-image": { preset: "mask-reveal", mode: "scroll-linked", duration: 900, delay: 0, distance: 60 },
    chapter: { preset: "sticky-pin", mode: "scroll-linked", duration: 700, delay: 0, distance: 40, pinLength: 100 },
    statistics: { preset: "stagger", mode: "in-view", duration: 600, delay: 0, distance: 24 },
    timeline: { preset: "slide-up", mode: "in-view", duration: 600, delay: 0, distance: 40 },
    quote: { preset: "fade-in", mode: "in-view", duration: 900, delay: 0, distance: 0 },
    cta: { preset: "scale-in", mode: "in-view", duration: 600, delay: 0, distance: 24 },
  };

  return {
    ...base,
    heading: draft.heading ?? base.heading,
    subheading: draft.subheading ?? base.subheading,
    eyebrow: draft.eyebrow,
    content: draft.content,
    data,
    animation: animationByType[type] ?? base.animation,
    interaction:
      type === "cta"
        ? {
            type: "cta",
            label: draft.ctaLabel ?? "Get started",
            href: draft.ctaHref || "#",
          }
        : base.interaction,
  };
}

export function normalizeDraft(
  draft: DraftStory,
  opts: {
    storyType?: string;
    slugBase?: string;
    description?: string;
    id?: string;
  } = {},
): StoryDocument {
  const sections = draft.sections.map(sectionFromDraft);
  const title = draft.title.trim();
  const slug = slugify(opts.slugBase || title) + "-" + nanoid(4).toLowerCase();

  const palette = draft.palette
    ? {
        paper: draft.palette.paper ?? "#f7f4ef",
        ink: draft.palette.ink ?? "#171614",
        accent: draft.palette.accent ?? "#b4622b",
        accentSoft: "#f0e2d5",
        line: "#e2dcd1",
        muted: "#56514a",
      }
    : undefined;

  const doc = createEmptyStory({
    id: opts.id ?? `story_${nanoid(12)}`,
    title,
    slug,
    description: draft.description || opts.description || "",
    storyType: opts.storyType ?? "ONE_PAGE",
    theme: draft.theme,
    palette,
    sections,
  });

  doc.seo = {
    title: title.slice(0, 70),
    description: (draft.description || "").slice(0, 180),
    noIndex: false,
    keywords: [],
  };

  return doc;
}

/** Sections the demo generator never fabricates full documents with. */
export const DEMO_NOTE =
  "Generated in Demo mode without a language model. Content is composed locally from your brief and should be reviewed and edited before publishing.";
