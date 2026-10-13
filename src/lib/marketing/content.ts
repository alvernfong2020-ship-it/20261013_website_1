/** Shared marketing copy — kept central so pages stay consistent and editable. */

export const STORY_TYPES: { title: string; body: string; href: string }[] = [
  { title: "One-page summary", body: "A single, persuasive scroll for a single idea.", href: "/templates?category=Company" },
  { title: "Product showcase", body: "Walk a buyer through benefits, feature by feature.", href: "/templates?category=Product" },
  { title: "Landing page", body: "A cinematic page that carries a campaign.", href: "/templates?category=Marketing" },
  { title: "About Us", body: "People, mission and the story so far.", href: "/templates?category=Company" },
  { title: "Brand story", body: "A long-form narrative with chapters and pull quotes.", href: "/templates?category=Marketing" },
  { title: "Pitch deck", body: "Slides as a scrolling argument the reader controls.", href: "/templates?category=Sales" },
  { title: "Educational resource", body: "Teach a concept step by step with a recap.", href: "/templates?category=Education" },
  { title: "Long-form article", body: "Editorial pacing for features and essays.", href: "/templates?category=Editorial" },
  { title: "Annual report", body: "Finance and strategy with a narrative spine.", href: "/templates?category=Data" },
  { title: "Data story", body: "Charts, annotations and a clear takeaway.", href: "/templates?category=Data" },
  { title: "White paper", body: "Rigorous structure without the PDF fatigue.", href: "/templates?category=Data" },
  { title: "Research report", body: "Findings, method and implications.", href: "/templates?category=Data" },
  { title: "Sales proposal", body: "Scope, evidence and pricing in one link.", href: "/templates?category=Sales" },
  { title: "Campaign microsite", body: "A focused, shareable experience for a launch.", href: "/templates?category=Marketing" },
];

export const AUDIENCES: { title: string; body: string }[] = [
  {
    title: "Marketing teams",
    body: "Ship campaign pages without waiting on engineering, then see where readers drop off.",
  },
  {
    title: "Founders",
    body: "Turn a pitch or product update into something memorable that works as a link.",
  },
  {
    title: "Creators",
    body: "Publish portfolio stories and features with editorial pacing and real typography.",
  },
  {
    title: "Agencies",
    body: "Build client microsites from reusable templates and duplicate them into new drafts.",
  },
  {
    title: "Educators",
    body: "Explain complex ideas in a sequence students can move through at their own pace.",
  },
  {
    title: "Researchers",
    body: "Present findings with data sections, method notes and accessible chart summaries.",
  },
  {
    title: "E-commerce businesses",
    body: "Give products a narrative — and measure which section drives clicks.",
  },
];

export const FAQS_HOME = [
  {
    question: "How does the AI generation actually work?",
    answer:
      "You provide a prompt, existing text, a document or a URL. The pipeline validates the input, extracts and normalises the source, plans a narrative outline, generates section-by-section content, attaches visuals, sets animation defaults, validates the result against a strict schema, then saves a draft. Every step is reported, and results are never fabricated: if no model provider is configured, the app clearly labels a demo result and shows a configuration notice.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No. You work entirely in a visual editor — reordering sections, editing text inline, swapping images and choosing animation presets. The published output is generated from structured, validated data; generated stories never execute arbitrary code.",
  },
  {
    question: "Can I import content I already have?",
    answer:
      "Yes. Paste written content, upload a supported document (PDF, plain text, Markdown, Word or JSON) or point the importer at a public URL. Source text is normalised into a clean working document you can edit before generating.",
  },
  {
    question: "How does publishing work?",
    answer:
      "Publishing freezes your current draft into an immutable version and gives the story a public URL. Editing the draft afterwards will not change the published page until you publish again — so a live story can never be corrupted by an in-progress edit. Previous versions remain restorable.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Pro and Pro+ plans allow custom domains. You add the hostname, we generate a DNS verification token, and the app actually queries DNS to confirm ownership. Automatic SSL and hosting provisioning depend on a configured hosting integration and are not enabled in this environment — the UI says so rather than pretending.",
  },
  {
    question: "What analytics do I get?",
    answer:
      "First-party, privacy-conscious events: page views, unique visitors, estimated engagement, scroll-depth distribution, section reach, call-to-action clicks and form submissions, with date-range filters and charts. Events are deduplicated so repeated observer callbacks are not counted as new visits. Demo workspaces are explicitly labelled.",
  },
  {
    question: "What are AI usage limits?",
    answer:
      "Each plan includes a monthly AI credit allowance, deducted per generation job and enforced server-side. When you reach your allowance the API refuses the request with a clear message rather than silently failing.",
  },
  {
    question: "Who owns the content, and how is it protected?",
    answer:
      "You own your stories, assets and data. Content is isolated per workspace with server-side authorisation on every request, uploads are type- and size-validated, and sensitive operations are written to an audit log. See our privacy policy for details.",
  },
];
