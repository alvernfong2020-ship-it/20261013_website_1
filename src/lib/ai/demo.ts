import { draftStorySchema, STORY_TYPE_LABELS, type DraftStory } from "./contract";
import type { GenerationInput } from "./prompt";

/**
 * Deterministic demo generator.
 *
 * Used ONLY when no language-model provider is configured. It composes a
 * sensible, on-brief story outline locally so the full end-to-end flow can be
 * exercised without credentials. Every story it produces is flagged as demo
 * output in the UI so it is never mistaken for a real generation.
 */

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugTitleFromPrompt(prompt: string): string {
  const clean = prompt.replace(/^[\s"']+|[\s"']+$/g, "");
  if (clean.length <= 60) return clean || "Your new story";
  const firstSentence = clean.split(/[.!?\n]/)[0] ?? clean;
  return firstSentence.slice(0, 60).trim() || "Your new story";
}

const TYPE_SECTION_PRESETS: Record<string, string[]> = {
  PITCH_DECK: ["hero", "statistics", "image-text", "feature-showcase", "timeline", "cta"],
  ANNUAL_REPORT: ["hero", "statistics", "rich-text", "chart", "timeline", "quote", "cta"],
  RESEARCH_REPORT: ["hero", "rich-text", "statistics", "chart", "comparison", "faq", "cta"],
  DATA_STORY: ["hero", "statistics", "chart", "image-text", "quote", "cta"],
  PRODUCT_SHOWCASE: ["hero", "image-text", "feature-showcase", "gallery", "comparison", "cta"],
  ABOUT_US: ["hero", "rich-text", "timeline", "statistics", "quote", "cta"],
  BRAND_STORY: ["hero", "rich-text", "fullscreen-image", "timeline", "quote", "cta"],
  LANDING_PAGE: ["hero", "feature-showcase", "image-text", "faq", "cta"],
  EDUCATIONAL: ["hero", "rich-text", "timeline", "feature-showcase", "faq", "cta"],
  LONG_FORM_ARTICLE: ["hero", "rich-text", "quote", "image-text", "rich-text", "cta"],
  WHITE_PAPER: ["hero", "rich-text", "statistics", "chart", "faq", "cta"],
  SALES_PROPOSAL: ["hero", "rich-text", "comparison", "timeline", "cta"],
  CASE_STUDY: ["hero", "rich-text", "statistics", "quote", "timeline", "cta"],
  CAMPAIGN_MICROSITE: ["hero", "feature-showcase", "gallery", "cta"],
};

const THEME_BY_STYLE: Record<string, DraftStory["theme"]> = {
  editorial: "editorial",
  cinematic: "cinematic",
  minimal: "minimal",
  bold: "bold",
  paper: "paper",
};

export function generateDemoDraft(input: GenerationInput): DraftStory {
  const source = (input.sourceText || input.prompt || "").trim();
  const title = slugTitleFromPrompt(input.prompt || src((input.sourceText || "")));
  const requestedType = input.storyType || "ONE_PAGE";
  const plan = TYPE_SECTION_PRESETS[requestedType] ?? [
    "hero",
    "rich-text",
    "image-text",
    "quote",
    "cta",
  ];

  const paras = sentences(source);
  const pick = (i: number, fallback: string) => paras[i] ? paras[i] : fallback;

  const sections: DraftStory["sections"] = plan.map((type, index) => {
    const headingSeed = idxHeading(index);
    switch (type) {
      case "hero":
        return {
          type: "hero",
          eyebrow: STORY_TYPE_LABELS[requestedType] ?? "Story",
          heading: title,
          subheading:
            pick(0, "A scroll-driven narrative composed in Demo mode. Edit every word in the visual editor."),
        };
      case "statistics":
        return {
          type: "statistics",
          heading: "The shape of it",
          subheading: "Illustrative figures — replace with verified data before publishing.",
          stats: [
            { value: "3×", label: "Faster to publish", description: "Compared with hand-built pages." },
            { value: "9", label: "Sections drafted", description: "Ready to reorder." },
            { value: "100%", label: "Editable", description: "Every block is yours to change." },
          ],
        };
      case "timeline":
        return {
          type: "timeline",
          heading: "How it unfolds",
          timeline: [
            { date: "Stage one", title: headingSeed[0], body: pick(1, "Describe the idea.") },
            { date: "Stage two", title: headingSeed[1], body: pick(2, "Refine the narrative.") },
            { date: "Stage three", title: headingSeed[2], body: pick(3, "Publish and measure.") },
          ],
        };
      case "feature-showcase":
        return {
          type: "feature-showcase",
          heading: "What stands out",
          features: [
            { title: headingSeed[0], body: pick(1, "A short, specific benefit.") },
            { title: headingSeed[1], body: pick(2, "Another reason it matters.") },
            { title: headingSeed[2], body: pick(3, "And one more.") },
          ],
        };
      case "faq":
        return {
          type: "faq",
          heading: "Questions people ask",
          faq: [
            { question: "Who is this for?", answer: pick(1, "Adjust this answer to name your audience.") },
            { question: "What should I do next?", answer: pick(2, "Add a clear next step here.") },
          ],
        };
      case "quote":
        return {
          type: "quote",
          content: pick(2, "A line worth remembering."),
          quoteAttribution: "— Attribution",
        };
      case "chart":
        return {
          type: "chart",
          heading: "The trend",
          subheading: "Replace with real figures.",
          content: "**Illustrative** — a demonstration chart rendered from structured data.",
        };
      case "comparison":
        return {
          type: "comparison",
          heading: "Before and after",
          content: "**Before** — the old way.\n\n**After** — the scroll-driven way.",
        };
      case "fullscreen-image":
        return {
          type: "fullscreen-image",
          heading: headingSeed[0],
          subheading: pick(3, "Add a full-bleed visual in the editor."),
        };
      case "image-text":
        return {
          type: "image-text",
          heading: headingSeed[0],
          content: pick(1, "Pair a visual with a short passage. Replace this copy in the editor."),
        };
      case "gallery":
        return {
          type: "gallery",
          heading: "Gallery",
          subheading: "Add images from your asset library.",
        };
      case "cta":
        return {
          type: "cta",
          heading: "Ready when you are",
          subheading: "This paragraph is editable — make the ask explicit.",
          ctaLabel: "Get started",
          ctaHref: "#",
        };
      case "rich-text":
      default:
        return {
          type: "rich-text",
          heading: headingSeed[index % headingSeed.length],
          content: [pick(index, "Add your first paragraph here."), pick(index + 1, "Add a second paragraph.")]
            .filter(Boolean)
            .join("\n\n"),
        };
    }
  });

  return draftStorySchema.parse({
    title,
    description: `A ${STORY_TYPE_LABELS[requestedType]?.toLowerCase() ?? "story"} about ${title.toLowerCase()}.`,
    theme: THEME_BY_STYLE[input.visualStyle || "editorial"] ?? "editorial",
    sections,
  });
}

function src(text: string) {
  return text.split(/[.!?\n]/)[0]?.slice(0, 60) || "Your new story";
}

function idxHeading(i: number): string[] {
  const sets = [
    ["Where it begins", "The idea", "The work", "The result"],
    ["Context", "Approach", "Outcome", "What's next"],
    ["The problem", "The method", "The evidence", "The call to action"],
  ];
  return sets[i % sets.length];
}
