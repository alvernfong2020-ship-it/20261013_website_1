import { createSection, newId } from "@/lib/story/factory";
import { parseStoryDocument, type StoryDocument, type StorySection, type SectionType } from "@/lib/story/schema";

/**
 * Template catalog.
 *
 * Templates are stored as complete, valid StoryDocuments — structured,
 * versioned data, not hardcoded pages. Each factory below returns a document
 * that is validated before it is used.
 */

type SectionSeed = Partial<StorySection> & { type: SectionType };

function buildDoc(
  meta: {
    title: string;
    slug: string;
    description: string;
    storyType: string;
    theme: StoryDocument["theme"];
    palette?: Partial<StoryDocument["palette"]>;
    category: string;
    tags: string[];
  },
  sections: SectionSeed[],
): TemplateSeed {
  const palette = {
    paper: "#f7f4ef",
    ink: "#171614",
    accent: "#b4622b",
    accentSoft: "#f0e2d5",
    line: "#e2dcd1",
    muted: "#56514a",
    ...meta.palette,
  };
  const id = `tpl_${meta.slug}`;
  const parsed = parseStoryDocument({
    schemaVersion: 1,
    id,
    title: meta.title,
    slug: meta.slug,
    description: meta.description,
    storyType: meta.storyType,
    theme: meta.theme,
    typography: { displayFont: "serif", bodyFont: "sans", scale: "normal" },
    palette,
    sections: sections.map((s) => createSection(s.type, s)),
    navigation: { showProgress: true, showChapterNav: false, showBackToTop: true, stickyHeader: true },
    seo: { title: meta.title, description: meta.description, noIndex: false, keywords: meta.tags },
    footer: { showBranding: true, links: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!parsed.ok) {
    throw new Error(`Template "${meta.slug}" is invalid: ${parsed.errors.join("; ")}`);
  }
  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    category: meta.category,
    storyType: meta.storyType,
    tags: meta.tags,
    document: parsed.value,
    version: 1,
    thumbnail: `/api/templates/${meta.slug}/thumbnail`,
  };
}

export type TemplateSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  storyType: string;
  tags: string[];
  document: StoryDocument;
  version: number;
  thumbnail: string;
};

export const TEMPLATE_CATEGORIES = [
  "Company",
  "Product",
  "Marketing",
  "Editorial",
  "Data",
  "Education",
  "Sales",
] as const;

function uid() {
  return newId("sec");
}

// ---------------------------------------------------------------------------
// Individual templates
// ---------------------------------------------------------------------------

const aboutUs = buildDoc(
  {
    title: "About Us — Studio Story",
    slug: "about-us",
    description: "Introduce your team, mission and history with a warm, editorial narrative.",
    storyType: "ABOUT_US",
    theme: "editorial",
    category: "Company",
    tags: ["company", "team", "mission"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "About", heading: "We make things worth reading.", subheading: "A studio built around narrative, craft and a healthy suspicion of the ordinary dashboard." },
    { id: uid(), type: "rich-text", heading: "Our story", content: "Founded on a simple belief: **the web can publish**.\n\nWe started as three people and a shared document. Today we help teams turn ideas into stories people actually finish." },
    { id: uid(), type: "timeline", heading: "How we got here", data: { items: [
      { date: "2019", title: "The first draft", body: "A prototype built over one long weekend." },
      { date: "2021", title: "The studio", body: "We grew into a small, focused team." },
      { date: "2024", title: "The platform", body: "We opened the tools to everyone." },
    ] } },
    { id: uid(), type: "statistics", heading: "By the numbers", data: { stats: [
      { value: "40k+", label: "Stories published", description: "Across every kind of team." },
      { value: "12", label: "Countries", description: "Where our readers are." },
      { value: "98%", label: "Would recommend", description: "From our annual survey." },
    ] } },
    { id: uid(), type: "quote", content: "Tell the story you would want to read.", data: { attribution: "— Founder" } },
    { id: uid(), type: "cta", heading: "Come build with us", subheading: "Start a story in minutes.", interaction: { type: "cta", label: "Start creating" } },
  ],
);

const portfolio = buildDoc(
  {
    title: "Portfolio — Selected Work",
    slug: "portfolio",
    description: "A gallery-forward portfolio for designers, studios and independent makers.",
    storyType: "PORTFOLIO",
    theme: "minimal",
    category: "Editorial",
    tags: ["portfolio", "creative", "gallery"],
    palette: { paper: "#f5f5f3", accent: "#1f1f1d" },
  },
  [
    { id: uid(), type: "hero", eyebrow: "Portfolio", heading: "Selected work, 2022–2025", subheading: "A short list of projects we are proud of." },
    { id: uid(), type: "gallery", heading: "Projects", subheading: "Add your own images from the asset library." },
    { id: uid(), type: "image-text", heading: "Approach", content: "We work in small teams and short cycles. **Craft over volume.**", layout: { mediaPosition: "right", columns: "split", width: "wide", align: "left", mediaWidth: 50, gap: "md" } },
    { id: uid(), type: "cta", heading: "Start a project", interaction: { type: "cta", label: "Get in touch" } },
  ],
);

const productLaunch = buildDoc(
  {
    title: "Product Launch",
    slug: "product-launch",
    description: "Announce a new product with a cinematic, benefit-led scroll.",
    storyType: "PRODUCT_SHOWCASE",
    theme: "cinematic",
    category: "Product",
    tags: ["launch", "product", "features"],
    palette: { paper: "#0f1115", ink: "#f5f3ee", accent: "#e0873f", accentSoft: "#241b12", line: "#2a2d33", muted: "#a9a49b" },
  },
  [
    { id: uid(), type: "hero", eyebrow: "New", heading: "Introducing the next release", subheading: "Everything you asked for, arranged the way you actually work.", background: { type: "gradient", gradient: { from: "#141821", to: "#0f1115", angle: 160 }, overlay: 0, fixed: false } },
    { id: uid(), type: "image-text", heading: "Built for the way you ship", content: "Faster paths, fewer clicks, a calmer surface.", layout: { mediaPosition: "right", columns: "split", width: "wide", align: "left", mediaWidth: 50, gap: "md" } },
    { id: uid(), type: "feature-showcase", heading: "Highlights", data: { items: [
      { title: "Instant previews", body: "See every change live." },
      { title: "Reusable blocks", body: "Compose once, reuse everywhere." },
      { title: "Accessible by default", body: "Keyboard and screen-reader ready." },
    ] } },
    { id: uid(), type: "fullscreen-image", heading: "A closer look", animation: { preset: "parallax", mode: "scroll-linked", duration: 900, delay: 0, distance: 80 } },
    { id: uid(), type: "cta", heading: "Try it today", interaction: { type: "cta", label: "Get started" } },
  ],
);

const brandStory = buildDoc(
  {
    title: "Brand Story",
    slug: "brand-story",
    description: "A long-form brand narrative with chapters, quotes and full-bleed imagery.",
    storyType: "BRAND_STORY",
    theme: "editorial",
    category: "Marketing",
    tags: ["brand", "narrative", "long-form"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Brand", heading: "The story behind the name", subheading: "Why we exist and what we are trying to build." },
    { id: uid(), type: "chapter", eyebrow: "Chapter one", heading: "An origin", content: "Every brand begins with a conviction. Ours was that clarity is a kindness." },
    { id: uid(), type: "fullscreen-image", heading: "" },
    { id: uid(), type: "rich-text", heading: "What we believe", content: "- Design is a service.\n- Words carry weight.\n- Simplicity is hard work." },
    { id: uid(), type: "quote", content: "Say the true thing, plainly.", data: { attribution: "— The team" } },
    { id: uid(), type: "cta", heading: "Work with us", interaction: { type: "cta", label: "Contact the studio" } },
  ],
);

const caseStudy = buildDoc(
  {
    title: "Case Study",
    slug: "case-study",
    description: "Show the problem, the work and the measurable result.",
    storyType: "CASE_STUDY",
    theme: "paper",
    category: "Marketing",
    tags: ["case study", "results", "b2b"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Case study", heading: "How a fintech halved its onboarding time", subheading: "A six-week engagement with measurable returns." },
    { id: uid(), type: "rich-text", heading: "The challenge", content: "New users were dropping out before they reached first value. The team needed evidence, not opinions." },
    { id: uid(), type: "statistics", heading: "The outcome", data: { stats: [
      { value: "−52%", label: "Time to onboard" },
      { value: "+31%", label: "Activation" },
      { value: "6 wks", label: "Engagement" },
    ] } },
    { id: uid(), type: "quote", content: "They found the problem we had been arguing about for a year.", data: { attribution: "— Head of Product" } },
    { id: uid(), type: "timeline", heading: "How we worked", data: { items: [
      { date: "Week 1–2", title: "Discovery" },
      { date: "Week 3–5", title: "Prototype and test" },
      { date: "Week 6", title: "Handover" },
    ] } },
    { id: uid(), type: "cta", heading: "Plan your engagement", interaction: { type: "cta", label: "Book a call" } },
  ],
);

const annualReport = buildDoc(
  {
    title: "Annual Report",
    slug: "annual-report",
    description: "A data-rich annual report with charts, highlights and a letter to stakeholders.",
    storyType: "ANNUAL_REPORT",
    theme: "paper",
    category: "Data",
    tags: ["report", "finance", "charts"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Annual report", heading: "Year in review", subheading: "Performance, people and the year ahead." },
    { id: uid(), type: "rich-text", heading: "A letter from the chair", content: "This was a year of steady, deliberate progress." },
    { id: uid(), type: "statistics", heading: "At a glance", data: { stats: [
      { value: "$48M", label: "Revenue" },
      { value: "+22%", label: "Year on year" },
      { value: "310", label: "People" },
    ] } },
    { id: uid(), type: "chart", heading: "Revenue by quarter", data: { series: [
      { label: "Q1", value: 9 }, { label: "Q2", value: 11 }, { label: "Q3", value: 13 }, { label: "Q4", value: 15 },
    ] } },
    { id: uid(), type: "cta", heading: "Read the full report", interaction: { type: "cta", label: "Download PDF" } },
  ],
);

const researchReport = buildDoc(
  {
    title: "Research Report",
    slug: "research-report",
    description: "Present findings, methodology and implications for a research audience.",
    storyType: "RESEARCH_REPORT",
    theme: "paper",
    category: "Data",
    tags: ["research", "academic", "findings"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Research", heading: "What we found", subheading: "A study of reading behaviour on scroll-driven pages." },
    { id: uid(), type: "rich-text", heading: "Abstract", content: "We analysed **12,400** sessions across published stories to understand where attention is spent." },
    { id: uid(), type: "chart", heading: "Scroll depth distribution", data: { series: [
      { label: "0–25%", value: 22 }, { label: "25–50%", value: 31 }, { label: "50–75%", value: 28 }, { label: "75–100%", value: 19 },
    ] } },
    { id: uid(), type: "rich-text", heading: "Implications", content: "Pinned chapters correlate with longer sessions, but can harm mobile completion when overused." },
    { id: uid(), type: "faq", heading: "Method notes", data: { items: [
      { question: "How was the sample collected?", answer: "Consented, first-party analytics on published stories." },
      { question: "What are the limitations?", answer: "Self-selecting sample; findings are directional." },
    ] } },
    { id: uid(), type: "cta", heading: "Read the paper", interaction: { type: "cta", label: "Open the full study" } },
  ],
);

const timelineTpl = buildDoc(
  {
    title: "Timeline",
    slug: "timeline",
    description: "A chronological, chapter-by-chapter narrative.",
    storyType: "TIMELINE",
    theme: "editorial",
    category: "Editorial",
    tags: ["timeline", "chronology", "history"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Timeline", heading: "A history in moments", subheading: "Follow the thread from the beginning." },
    { id: uid(), type: "timeline", heading: "The sequence", data: { items: [
      { date: "First", title: "A beginning", body: "Where it all started." },
      { date: "Then", title: "A turning point", body: "What changed." },
      { date: "Now", title: "Where we are", body: "The present state." },
      { date: "Next", title: "What comes next", body: "The road ahead." },
    ] } },
    { id: uid(), type: "cta", heading: "Explore more", interaction: { type: "cta", label: "See related stories" } },
  ],
);

const magazine = buildDoc(
  {
    title: "Magazine Feature",
    slug: "magazine-feature",
    description: "A long-read feature with a strong opening spread and pull quotes.",
    storyType: "LONG_FORM_ARTICLE",
    theme: "editorial",
    category: "Editorial",
    tags: ["feature", "long-read", "essay"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Feature", heading: "The Craft of Slowness", subheading: "In an age of infinite feeds, some designers are choosing depth." },
    { id: uid(), type: "rich-text", heading: "", content: "There is a particular pleasure in a page that asks you to keep going. Not because it notifies you, but because it earns your attention, one screen at a time.\n\nThe mechanics are simple — a scroll, a reveal, a held image — but the effect is cumulative." },
    { id: uid(), type: "fullscreen-image", heading: "" },
    { id: uid(), type: "quote", content: "Pacing is not decoration. It is argument.", data: { attribution: "— Amara Whitfield" } },
    { id: uid(), type: "rich-text", heading: "What pacing buys you", content: "**Time.** The reader's, spent deliberately." },
    { id: uid(), type: "cta", heading: "Read the next feature", interaction: { type: "cta", label: "Continue" } },
  ],
);

const eventPromotion = buildDoc(
  {
    title: "Event Promotion",
    slug: "event-promotion",
    description: "Promote a conference, launch or meet-up with a clear call to register.",
    storyType: "EVENT_PROMOTION",
    theme: "bold",
    category: "Marketing",
    tags: ["event", "conference", "registration"],
    palette: { paper: "#fdf8f0", accent: "#d2451e" },
  },
  [
    { id: uid(), type: "hero", eyebrow: "October 2026 · Lisbon", heading: "The Story Conference", subheading: "Two days of craft, narrative and the web.", interaction: { type: "cta", label: "Register now" } },
    { id: uid(), type: "feature-showcase", heading: "What to expect", data: { items: [
      { title: "Talks", body: "Twenty speakers across two stages." },
      { title: "Workshops", body: "Hands-on, small-group sessions." },
      { title: "Studio tours", body: "Visit the studios shaping the web." },
    ] } },
    { id: uid(), type: "timeline", heading: "Run of show", data: { items: [
      { date: "Day one", title: "Craft" },
      { date: "Day two", title: "Practice" },
    ] } },
    { id: uid(), type: "contact-form", heading: "Reserve your place", interaction: { type: "form", formFields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "tickets", label: "Number of tickets", type: "select", required: true, options: ["1", "2", "3+"] },
    ] } },
  ],
);

const educational = buildDoc(
  {
    title: "Educational Explainer",
    slug: "educational-explainer",
    description: "Teach a concept step by step with diagrams, examples and a recap.",
    storyType: "EDUCATIONAL",
    theme: "minimal",
    category: "Education",
    tags: ["education", "explainer", "tutorial"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Explainer", heading: "How scrollytelling works", subheading: "A short, practical guide to scroll-driven narrative." },
    { id: uid(), type: "rich-text", heading: "The core idea", content: "Content is revealed as the reader scrolls. **Position becomes meaning.**" },
    { id: uid(), type: "timeline", heading: "The three techniques", data: { items: [
      { date: "01", title: "In-view reveal", body: "Fires once when an element enters the viewport." },
      { date: "02", title: "Scroll-linked", body: "Tracks scroll position continuously." },
      { date: "03", title: "Pinned chapters", body: "Holds a panel while text advances." },
    ] } },
    { id: uid(), type: "faq", heading: "Common questions", data: { items: [
      { question: "Does it work without JavaScript?", answer: "Yes — content stays visible and readable." },
      { question: "What about reduced motion?", answer: "Animations are disabled automatically." },
    ] } },
    { id: uid(), type: "cta", heading: "Try it yourself", interaction: { type: "cta", label: "Open the editor" } },
  ],
);

const dataStory = buildDoc(
  {
    title: "Data Story",
    slug: "data-story",
    description: "Turn a dataset into a narrative with charts, annotations and a takeaway.",
    storyType: "DATA_STORY",
    theme: "paper",
    category: "Data",
    tags: ["data", "charts", "visualisation"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Data story", heading: "Attention, measured", subheading: "What 12,400 reading sessions tell us." },
    { id: uid(), type: "statistics", heading: "The headline", data: { stats: [
      { value: "78%", label: "Reach the second section" },
      { value: "3m 12s", label: "Median session" },
      { value: "19%", label: "Finish the page" },
    ] } },
    { id: uid(), type: "chart", heading: "Completion by story type", data: { series: [
      { label: "Data", value: 19 }, { label: "Editorial", value: 34 }, { label: "Product", value: 41 }, { label: "Report", value: 27 },
    ] } },
    { id: uid(), type: "rich-text", heading: "Why it matters", content: "Shorter, well-paced stories hold attention further. **Length is not depth.**" },
    { id: uid(), type: "cta", heading: "See the methodology", interaction: { type: "cta", label: "Read the appendix" } },
  ],
);

const salesProposal = buildDoc(
  {
    title: "Sales Proposal",
    slug: "sales-proposal",
    description: "A persuasive, structured proposal with scope, evidence and pricing.",
    storyType: "SALES_PROPOSAL",
    theme: "paper",
    category: "Sales",
    tags: ["sales", "proposal", "b2b"],
  },
  [
    { id: uid(), type: "hero", eyebrow: "Proposal", heading: "A plan for your launch", subheading: "Prepared for the Acme marketing team." },
    { id: uid(), type: "rich-text", heading: "Your goals", content: "Launch the new product with a narrative that carries from awareness to sign-up." },
    { id: uid(), type: "comparison", heading: "Where we add value", content: "**Before** — a static page nobody shares.\n\n**After** — a scroll-driven story with measurable engagement." },
    { id: uid(), type: "timeline", heading: "Timeline", data: { items: [
      { date: "Weeks 1–2", title: "Strategy and outline" },
      { date: "Weeks 3–4", title: "Design and build" },
      { date: "Week 5", title: "Launch and measure" },
    ] } },
    { id: uid(), type: "cta", heading: "Ready to begin", interaction: { type: "cta", label: "Accept proposal" } },
  ],
);

export const TEMPLATE_SEEDS: TemplateSeed[] = [
  aboutUs,
  portfolio,
  productLaunch,
  brandStory,
  caseStudy,
  annualReport,
  researchReport,
  timelineTpl,
  magazine,
  eventPromotion,
  educational,
  dataStory,
  salesProposal,
];
