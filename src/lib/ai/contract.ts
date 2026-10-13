import { z } from "zod";
import { SECTION_TYPES } from "@/lib/story/schema";

/**
 * Intermediate authoring format the model (or demo generator) returns before it
 * is normalised into a full StoryDocument. Keeping this layer small makes the
 * model prompt reliable and the output easy to validate.
 */

const draftSectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  eyebrow: z.string().max(80).optional(),
  heading: z.string().max(240).optional(),
  subheading: z.string().max(500).optional(),
  content: z.string().max(8000).optional(),
  /** Optional structured payload depending on section type. */
  stats: z.array(z.object({ value: z.string(), label: z.string(), description: z.string().optional() })).optional(),
  timeline: z.array(z.object({ date: z.string(), title: z.string(), body: z.string().optional() })).optional(),
  features: z.array(z.object({ title: z.string(), body: z.string().optional() })).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  ctaLabel: z.string().max(120).optional(),
  ctaHref: z.string().max(500).optional(),
  quoteAttribution: z.string().max(160).optional(),
});

export const draftStorySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(""),
  theme: z.enum(["editorial", "cinematic", "minimal", "bold", "paper"]).default("editorial"),
  palette: z
    .object({
      paper: z.string().optional(),
      ink: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional(),
  sections: z.array(draftSectionSchema).min(1).max(60),
});

export type DraftStory = z.infer<typeof draftStorySchema>;
export type DraftSection = z.infer<typeof draftSectionSchema>;

export const STORY_TYPE_LABELS: Record<string, string> = {
  ONE_PAGE: "One-page summary",
  PRODUCT_SHOWCASE: "Product showcase",
  LANDING_PAGE: "Landing page",
  ABOUT_US: "About us",
  BRAND_STORY: "Brand story",
  PITCH_DECK: "Pitch deck",
  EDUCATIONAL: "Educational resource",
  LONG_FORM_ARTICLE: "Long-form article",
  ANNUAL_REPORT: "Annual report",
  DATA_STORY: "Data story",
  WHITE_PAPER: "White paper",
  RESEARCH_REPORT: "Research report",
  SALES_PROPOSAL: "Sales proposal",
  CAMPAIGN_MICROSITE: "Campaign microsite",
  PORTFOLIO: "Portfolio",
  CASE_STUDY: "Case study",
  TIMELINE: "Timeline",
  MAGAZINE_FEATURE: "Magazine feature",
  EVENT_PROMOTION: "Event promotion",
  OTHER: "Story",
};

export const TONES = ["editorial", "confident", "warm", "technical", "playful", "formal"] as const;
export const VISUAL_STYLES = ["editorial", "cinematic", "minimal", "bold", "paper"] as const;
