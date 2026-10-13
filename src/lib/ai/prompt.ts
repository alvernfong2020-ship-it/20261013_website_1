import { STORY_TYPE_LABELS } from "./contract";

export type GenerationInput = {
  prompt: string;
  sourceText?: string;
  sourceUrl?: string;
  audience?: string;
  storyType?: string;
  tone?: string;
  visualStyle?: string;
  brandNotes?: string;
  assetUrls?: { url: string; alt: string }[];
};

export function buildSystemPrompt(): string {
  return [
    "You are a senior editorial art director and narrative designer for a scrollytelling platform.",
    "You turn a brief into a structured, scroll-driven web story outline.",
    "You always reply with a single JSON object and nothing else.",
    "",
    "The JSON must match this shape exactly:",
    `{
  "title": string,
  "description": string (max 500 chars),
  "theme": one of "editorial" | "cinematic" | "minimal" | "bold" | "paper",
  "palette": { "paper": hex, "ink": hex, "accent": hex } (optional),
  "sections": [
    {
      "type": one of ${JSON.stringify([
        "hero",
        "rich-text",
        "image-text",
        "fullscreen-image",
        "quote",
        "timeline",
        "statistics",
        "feature-showcase",
        "gallery",
        "chart",
        "comparison",
        "cta",
        "faq",
        "chapter",
      ])},
      "eyebrow": string (optional, <=80 chars),
      "heading": string (optional, <=240 chars),
      "subheading": string (optional, <=500 chars),
      "content": string (optional; a few short paragraphs separated by blank lines; allowed markdown: **bold**, *italic*, [link](https://...), "- " bullets, "## " subheading),
      "stats": [{ "value": string, "label": string, "description": string }] (only for statistics),
      "timeline": [{ "date": string, "title": string, "body": string }] (only for timeline),
      "features": [{ "title": string, "body": string }] (only for feature-showcase),
      "faq": [{ "question": string, "answer": string }] (only for faq),
      "quoteAttribution": string (only for quote),
      "ctaLabel": string (only for cta),
      "ctaHref": string (only for cta)
    }
  ]
}`,
    "",
    "Rules:",
    "- Open with a hero section and close with a cta section unless the brief clearly calls for otherwise.",
    "- Produce between 5 and 10 sections. Keep copy concrete and specific to the brief; never invent statistics as fact — if you give numbers, phrase them as illustrative.",
    "- Use no more than one statistics, one timeline, one chart and one faq section.",
    "- Do not include images or URLs in the JSON; visuals are added later from the asset library.",
    "- Never output HTML, scripts, or markdown outside the allowed subset.",
  ].join("\n");
}

export function buildUserPrompt(input: GenerationInput): string {
  const lines: string[] = [];
  lines.push(`Brief: ${input.prompt}`);
  if (input.storyType) lines.push(`Story type: ${STORY_TYPE_LABELS[input.storyType] ?? input.storyType}`);
  if (input.audience) lines.push(`Target audience: ${input.audience}`);
  if (input.tone) lines.push(`Preferred tone: ${input.tone}`);
  if (input.visualStyle) lines.push(`Preferred visual style / theme: ${input.visualStyle}`);
  if (input.brandNotes) lines.push(`Brand guidelines: ${input.brandNotes}`);
  if (input.sourceUrl) lines.push(`Source URL (public reference): ${input.sourceUrl}`);
  if (input.sourceText) {
    lines.push("");
    lines.push("Existing source content to transform (rewrite and restructure, do not copy verbatim):");
    lines.push('"""');
    lines.push(input.sourceText.slice(0, 12000));
    lines.push('"""');
  }
  lines.push("");
  lines.push("Return the JSON object now.");
  return lines.join("\n");
}
