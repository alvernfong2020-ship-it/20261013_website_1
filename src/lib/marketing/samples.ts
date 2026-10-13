import { createEmptyStory, createSection } from "@/lib/story/factory";
import { parseStoryDocument, type StoryDocument } from "@/lib/story/schema";

/**
 * Sample story documents used across the marketing site.
 *
 * These are real, schema-valid documents rendered by the same engine as
 * published stories — the hero and "product demonstration" sections use the
 * actual components, not screenshots.
 */

export const HERO_STORY: StoryDocument = must(
  createEmptyStory({
    id: "sample_hero",
    title: "The Long Read",
    slug: "the-long-read",
    description: "A demonstration scroll story.",
    storyType: "BRAND_STORY",
    theme: "cinematic",
    palette: {
      paper: "#12141a",
      ink: "#f4f1ea",
      accent: "#d88347",
      accentSoft: "#2a1e14",
      line: "#2b2f37",
      muted: "#a7a29a",
    },
    sections: [
      createSection("hero", {
        eyebrow: "A demonstration",
        heading: "Every page is a place you move through.",
        subheading: "Scrolling becomes the act of reading. Content arrives, holds, and gives way.",
        animation: { preset: "fade-in", mode: "in-view", duration: 800, delay: 0, distance: 40 },
      }),
      createSection("statistics", {
        heading: "Attention compounds",
        data: {
          stats: [
            { value: "3.4×", label: "Time on page", description: "Compared with static layouts." },
            { value: "78%", label: "Reach section two" },
            { value: "61%", label: "Finish the story" },
          ],
        },
      }),
      createSection("rich-text", {
        heading: "Pacing is the argument",
        content:
          "A story is not a stack of blocks. **It is a sequence of decisions** — what to hold, what to reveal, and when to let the reader move on.",
      }),
      createSection("quote", {
        content: "The reader should feel the shape of the idea before they finish the sentence.",
        data: { attribution: "— The editorial desk" },
      }),
      createSection("cta", { heading: "Begin your story", interaction: { type: "cta", label: "Start creating" } }),
    ],
  }),
);

/** A short document used by the "product demonstration" section. */
export const DEMO_STORY: StoryDocument = must(
  createEmptyStory({
    id: "sample_demo",
    title: "Product tour",
    slug: "product-tour",
    storyType: "PRODUCT_SHOWCASE",
    theme: "editorial",
    sections: [
      createSection("hero", { eyebrow: "Tour", heading: "From idea to published story", subheading: "Three steps, no code." }),
      createSection("feature-showcase", {
        heading: "What you can build",
        data: {
          items: [
            { title: "Campaign microsites", body: "A scroll story that carries a launch." },
            { title: "Annual reports", body: "Numbers with a narrative spine." },
            { title: "Long-form features", body: "Editorial pacing on the open web." },
          ],
        },
      }),
      createSection("cta", { heading: "Try the editor", interaction: { type: "cta", label: "Open studio" } }),
    ],
  }),
);

function must(doc: StoryDocument): StoryDocument {
  const parsed = parseStoryDocument(doc);
  if (!parsed.ok) throw new Error(`Sample story invalid: ${parsed.errors.join("; ")}`);
  return parsed.value;
}
