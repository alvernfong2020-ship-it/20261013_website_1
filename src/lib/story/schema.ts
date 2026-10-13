import { z } from "zod";

/**
 * Story document schema.
 *
 * Every story — template, generated draft, or hand-authored — is stored as a
 * validated JSON document matching this schema. The renderer only ever reads
 * from parsed, validated documents; generated JavaScript is never executed.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex colour like #1a1a1a");

/** Only allow https/http/relative paths and data: images. Blocks javascript: etc. */
export const safeUrl = z.string().refine(
  (v) => {
    if (v.startsWith("/")) return true; // same-origin relative asset
    try {
      const u = new URL(v);
      return ["http:", "https:", "data:"].includes(u.protocol);
    } catch {
      return false;
    }
  },
  { message: "Unsafe or malformed URL" },
);

const mediaRef = z.object({
  url: z.string().trim().min(1),
  alt: z.string().default(""),
  assetId: z.string().optional(),
  caption: z.string().optional(),
  focalPoint: z.enum(["center", "top", "bottom", "left", "right"]).default("center"),
});

const spacing = z.object({
  top: z.enum(["none", "sm", "md", "lg", "xl"]).default("lg"),
  bottom: z.enum(["none", "sm", "md", "lg", "xl"]).default("lg"),
});

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

export const ANIMATION_PRESETS = [
  "none",
  "fade-in",
  "slide-up",
  "slide-left",
  "slide-right",
  "scale-in",
  "mask-reveal",
  "parallax",
  "crossfade",
  "sticky-pin",
  "stagger",
] as const;

const animationSchema = z.object({
  preset: z.enum(ANIMATION_PRESETS).default("fade-in"),
  /** Scroll-linked (progress driven) vs in-view (IntersectionObserver). */
  mode: z.enum(["in-view", "scroll-linked"]).default("in-view"),
  duration: z.number().min(0).max(4000).default(600),
  delay: z.number().min(0).max(3000).default(0),
  distance: z.number().min(0).max(400).default(40),
  /** For sticky-pin / chapter narratives. */
  pinLength: z.number().min(0).max(400).optional(),
});

export type AnimationConfig = z.infer<typeof animationSchema>;

// ---------------------------------------------------------------------------
// Layout / background / responsive
// ---------------------------------------------------------------------------

const layoutSchema = z.object({
  width: z.enum(["narrow", "wide", "full", "bleed"]).default("wide"),
  columns: z.enum(["1", "2", "3", "split"]).default("1"),
  align: z.enum(["left", "center", "right"]).default("left"),
  mediaPosition: z.enum(["left", "right", "top", "bottom", "background"]).default("right"),
  mediaWidth: z.number().min(10).max(90).default(50),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
});

const backgroundSchema = z.object({
  type: z.enum(["none", "color", "image", "video", "gradient"]).default("none"),
  color: hexColor.optional(),
  image: mediaRef.optional(),
  videoUrl: safeUrl.optional(),
  poster: safeUrl.optional(),
  gradient: z
    .object({
      from: hexColor,
      to: hexColor,
      angle: z.number().min(0).max(360).default(160),
    })
    .optional(),
  overlay: z.number().min(0).max(1).default(0),
  /** Fixed backgrounds become sticky viewports. */
  fixed: z.boolean().default(false),
});

const responsiveSchema = z.object({
  hideOnMobile: z.boolean().default(false),
  hideOnDesktop: z.boolean().default(false),
  stackOnMobile: z.boolean().default(true),
  reducedHeightOnMobile: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Interaction configuration (per-section, non-executable)
// ---------------------------------------------------------------------------

const interactionSchema = z.object({
  type: z.enum(["none", "cta", "form", "external-link", "scroll-to", "lightbox"]).default("none"),
  label: z.string().max(120).optional(),
  href: safeUrl.optional(),
  formFields: z
    .array(
      z.object({
        name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
        label: z.string(),
        type: z.enum(["text", "email", "tel", "textarea", "select", "checkbox"]),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
        placeholder: z.string().optional(),
      }),
    )
    .max(20)
    .optional(),
  consentText: z.string().max(400).optional(),
});

// ---------------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------------

export const SECTION_TYPES = [
  "hero",
  "rich-text",
  "image-text",
  "fullscreen-image",
  "video",
  "quote",
  "timeline",
  "statistics",
  "feature-showcase",
  "gallery",
  "carousel",
  "chart",
  "comparison",
  "cta",
  "faq",
  "contact-form",
  "chapter",
  "spacer",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

const statItem = z.object({
  value: z.string().max(40),
  label: z.string().max(80),
  description: z.string().max(240).optional(),
});

const timelineItem = z.object({
  date: z.string().max(60),
  title: z.string().max(140),
  body: z.string().max(800).optional(),
  media: mediaRef.optional(),
});

const featureItem = z.object({
  title: z.string().max(140),
  body: z.string().max(600).optional(),
  icon: z.string().max(40).optional(),
  media: mediaRef.optional(),
});

const galleryItem = z.object({
  media: mediaRef,
  caption: z.string().max(200).optional(),
});

const chartSeries = z.object({
  label: z.string().max(80),
  value: z.number(),
  color: hexColor.optional(),
});

const comparisonItem = z.object({
  label: z.string().max(80),
  left: z.string().max(300),
  right: z.string().max(300),
});

const faqItem = z.object({
  question: z.string().max(240),
  answer: z.string().max(2000),
});

const DEFAULT_LAYOUT = {
  width: "wide",
  columns: "1",
  align: "left",
  mediaPosition: "right",
  mediaWidth: 50,
  gap: "md",
} as const;
const DEFAULT_BACKGROUND = { type: "none", overlay: 0, fixed: false } as const;
const DEFAULT_ANIMATION = {
  preset: "fade-in",
  mode: "in-view",
  duration: 600,
  delay: 0,
  distance: 40,
} as const;
const DEFAULT_RESPONSIVE = {
  hideOnMobile: false,
  hideOnDesktop: false,
  stackOnMobile: true,
  reducedHeightOnMobile: false,
} as const;
const DEFAULT_SPACING = { top: "lg", bottom: "lg" } as const;
const DEFAULT_INTERACTION = { type: "none" } as const;
const DEFAULT_TYPOGRAPHY = { displayFont: "serif", bodyFont: "sans", scale: "normal" } as const;
const DEFAULT_PALETTE = {
  paper: "#f7f4ef",
  ink: "#171614",
  accent: "#b4622b",
  accentSoft: "#f0e2d5",
  line: "#e2dcd1",
  muted: "#56514a",
} as const;
const DEFAULT_NAVIGATION = {
  showProgress: true,
  showChapterNav: false,
  showBackToTop: true,
  stickyHeader: true,
} as const;
const DEFAULT_SEO = { title: "", description: "", noIndex: false, keywords: [] } as const;
const DEFAULT_FOOTER = { showBranding: true, links: [] } as const;

const sectionBase = {
  id: z.string().min(1).max(64),
  type: z.enum(SECTION_TYPES),
  heading: z.string().max(240).optional(),
  subheading: z.string().max(500).optional(),
  /** Rich text is a restricted markdown subset — parsed, never injected as HTML. */
  content: z.string().max(20000).optional(),
  eyebrow: z.string().max(80).optional(),
  media: z.array(mediaRef).default(() => []),
  layout: layoutSchema.default(() => ({ ...DEFAULT_LAYOUT })),
  background: backgroundSchema.default(() => ({ ...DEFAULT_BACKGROUND })),
  animation: animationSchema.default(() => ({ ...DEFAULT_ANIMATION })),
  responsive: responsiveSchema.default(() => ({ ...DEFAULT_RESPONSIVE })),
  spacing: spacing.default(() => ({ ...DEFAULT_SPACING })),
  interaction: interactionSchema.default(() => ({ ...DEFAULT_INTERACTION })),
  anchorId: z.string().max(64).optional(),
  /** Section-specific structured payload. */
  data: z.record(z.string(), z.unknown()).default(() => ({})),
};

export const sectionSchema = z.object(sectionBase);

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

const typographySchema = z.object({
  displayFont: z.enum(["serif", "sans", "mono"]).default("serif"),
  bodyFont: z.enum(["sans", "serif"]).default("sans"),
  scale: z.enum(["compact", "normal", "large", "editorial"]).default("normal"),
});

const paletteSchema = z.object({
  paper: hexColor.default("#f7f4ef"),
  ink: hexColor.default("#171614"),
  accent: hexColor.default("#b4622b"),
  accentSoft: hexColor.default("#f0e2d5"),
  line: hexColor.default("#e2dcd1"),
  muted: hexColor.default("#56514a"),
});

const navigationSchema = z.object({
  showProgress: z.boolean().default(true),
  showChapterNav: z.boolean().default(false),
  showBackToTop: z.boolean().default(true),
  stickyHeader: z.boolean().default(true),
});

const seoSchema = z.object({
  title: z.string().max(70).default(""),
  description: z.string().max(180).default(""),
  ogImage: safeUrl.optional(),
  canonical: safeUrl.optional(),
  noIndex: z.boolean().default(false),
  keywords: z.array(z.string().max(60)).max(20).default([]),
});

export const storyDocumentSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  id: z.string().min(1),
  title: z.string().min(1).max(240),
  slug: z.string().min(1).max(80),
  description: z.string().max(600).default(""),
  storyType: z.string().max(40).default("ONE_PAGE"),
  theme: z.enum(["editorial", "cinematic", "minimal", "bold", "paper"]).default("editorial"),
  typography: typographySchema.default(() => ({ ...DEFAULT_TYPOGRAPHY })),
  palette: paletteSchema.default(() => ({ ...DEFAULT_PALETTE })),
  sections: z.array(sectionSchema).min(0).max(120),
  navigation: navigationSchema.default(() => ({ ...DEFAULT_NAVIGATION })),
  seo: seoSchema.default(() => ({ ...DEFAULT_SEO, keywords: [] })),
  footer: z
    .object({
      showBranding: z.boolean().default(true),
      text: z.string().max(300).optional(),
      links: z
        .array(z.object({ label: z.string().max(60), href: safeUrl }))
        .max(8)
        .default(() => []),
    })
    .default(() => ({ showBranding: true, links: [] })),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type StoryDocument = z.infer<typeof storyDocumentSchema>;
export type StorySection = z.infer<typeof sectionSchema>;
export type MediaRef = z.infer<typeof mediaRef>;
export type Palette = z.infer<typeof paletteSchema>;

// ---------------------------------------------------------------------------
// Validation helper used everywhere stories are written or read
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export function parseStoryDocument(input: unknown): ValidationResult<StoryDocument> {
  const result = storyDocumentSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const errors = result.error.issues.map(
    (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
  );
  return { ok: false, errors };
}

/** Sanitise a story document, coercing unknown section types out. */
export function sanitizeStoryDocument(input: unknown): ValidationResult<StoryDocument> {
  const parsed = parseStoryDocument(input);
  if (parsed.ok) return parsed;
  // Attempt recovery: drop sections that fail validation, then re-parse.
  if (input && typeof input === "object" && "sections" in input) {
    const obj = input as Record<string, unknown>;
    const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
    const recovered = rawSections.filter(
      (s) => sectionSchema.safeParse(s).success,
    );
    return parseStoryDocument({ ...obj, sections: recovered });
  }
  return parsed;
}

export const emptySectionDefaults: Record<SectionType, Partial<StorySection>> = {
  hero: { heading: "A new chapter", subheading: "Tell your story.", animation: { preset: "fade-in", mode: "in-view", duration: 700, delay: 0, distance: 40 } },
  "rich-text": { heading: "Section heading", content: "Write your story here." },
  "image-text": { heading: "Heading", content: "Supporting copy." },
  "fullscreen-image": { heading: "" },
  video: { heading: "" },
  quote: { content: "A memorable line." },
  timeline: { heading: "Timeline" },
  statistics: { heading: "By the numbers" },
  "feature-showcase": { heading: "Features" },
  gallery: { heading: "Gallery" },
  carousel: { heading: "Gallery" },
  chart: { heading: "The data" },
  comparison: { heading: "Compare" },
  cta: { heading: "Get started", interaction: { type: "cta", label: "Get started" } },
  faq: { heading: "Frequently asked questions" },
  "contact-form": { heading: "Get in touch", interaction: { type: "form", formFields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "message", label: "Message", type: "textarea", required: true },
  ] } },
  chapter: { heading: "Chapter" },
  spacer: {},
};
