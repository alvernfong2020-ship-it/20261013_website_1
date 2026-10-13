import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEMPLATE_SEEDS } from "../src/lib/templates/catalog";
import { parseStoryDocument } from "../src/lib/story/schema";

const prisma = new PrismaClient();

/**
 * Seed data.
 *
 * - Templates: the full catalog, marked as system templates.
 * - A demo workspace ("Demo Studio") with a demo owner and a few PUBLISHED
 *   stories so analytics and the public viewer have something real to show.
 *   The workspace is explicitly labelled DEMO in its settings, and its
 *   analytics are seeded demonstration data (clearly flagged).
 */

const DEMO_EMAIL = "demo@scrollwright.example";
const DEMO_PASSWORD = "demo-password-123";

async function seedTemplates() {
  for (const t of TEMPLATE_SEEDS) {
    const parsed = parseStoryDocument(t.document);
    if (!parsed.ok) {
      throw new Error(`Seed template "${t.slug}" is invalid: ${parsed.errors.join("; ")}`);
    }
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {
        title: t.title,
        description: t.description,
        category: t.category,
        storyType: t.storyType as never,
        document: parsed.value as object,
        version: t.version,
        tags: t.tags,
        thumbnail: t.thumbnail,
        isSystem: true,
      },
      create: {
        slug: t.slug,
        title: t.title,
        description: t.description,
        category: t.category,
        storyType: t.storyType as never,
        document: parsed.value as object,
        version: t.version,
        tags: t.tags,
        thumbnail: t.thumbnail,
        isSystem: true,
      },
    });
  }
  console.log(`Seeded ${TEMPLATE_SEEDS.length} templates.`);
}

async function seedDemo() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo Studio",
      passwordHash,
      onboardedAt: new Date(),
      onboarding: { goal: "demo", audience: "everyone", style: "editorial", hasContent: true },
    },
  });

  let workspace = await prisma.workspace.findUnique({ where: { slug: "demo-studio" } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "Demo Studio",
        slug: "demo-studio",
        ownerId: user.id,
        plan: "PRO",
        settings: { isDemo: true, note: "This workspace is seeded demonstration data." },
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });
  }

  const existing = await prisma.story.count({ where: { workspaceId: workspace.id } });
  if (existing > 0) {
    console.log("Demo stories already present; skipping.");
    return;
  }

  // Two published stories derived from templates, plus one draft.
  const publishedSlugs = ["brand-story", "data-story"];
  for (const slug of publishedSlugs) {
    const tpl = TEMPLATE_SEEDS.find((t) => t.slug === slug)!;
    const doc = structuredClone(tpl.document);
    doc.id = `story_${slug}_demo`;
    doc.slug = `${slug}-demo`;

    const story = await prisma.story.create({
      data: {
        workspaceId: workspace.id,
        authorId: user.id,
        title: tpl.title,
        slug: doc.slug,
        description: tpl.description,
        storyType: tpl.storyType as never,
        status: "DRAFT",
        document: doc as object,
        seo: doc.seo as object,
        theme: doc.theme,
      },
    });

    const version = await prisma.storyVersion.create({
      data: {
        storyId: story.id,
        version: 1,
        document: doc as object,
        title: story.title,
        description: story.description,
        seo: doc.seo as object,
        createdBy: user.id,
      },
    });
    await prisma.story.update({
      where: { id: story.id },
      data: { status: "PUBLISHED", publishedVersionId: version.id },
    });

    await seedAnalytics(story.id, slug);
  }

  // A draft to show the dashboard's draft state.
  const draftTpl = TEMPLATE_SEEDS.find((t) => t.slug === "product-launch")!;
  const draftDoc = structuredClone(draftTpl.document);
  draftDoc.id = "story_product_launch_demo";
  draftDoc.slug = "product-launch-draft";
  await prisma.story.create({
    data: {
      workspaceId: workspace.id,
      authorId: user.id,
      title: "Product launch (draft)",
      slug: draftDoc.slug,
      description: "Work in progress.",
      storyType: "PRODUCT_SHOWCASE",
      status: "DRAFT",
      document: draftDoc as object,
      seo: draftDoc.seo as object,
      theme: draftDoc.theme,
    },
  });

  console.log(`Seeded demo workspace. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

/** Deterministic pseudo-analytics so dashboards are not empty in the demo. */
async function seedAnalytics(storyId: string, seedKey: string) {
  let seed = 0;
  for (const ch of seedKey) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const events: {
    storyId: string;
    type: string;
    sessionId: string;
    sectionId?: string;
    value?: number;
    createdAt: Date;
  }[] = [];

  const days = 30;
  for (let d = days; d >= 0; d--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - d);
    const views = Math.round(6 + rand() * 24);
    for (let v = 0; v < views; v++) {
      const sessionId = `demo_${seedKey}_${d}_${v}`;
      events.push({
        storyId,
        type: "page_view",
        sessionId,
        createdAt: date,
        value: null as unknown as number,
      });
      const depth = Math.round(25 + rand() * 75);
      events.push({ storyId, type: "scroll_depth", sessionId, value: depth, createdAt: date });
      if (rand() > 0.82) events.push({ storyId, type: "cta_click", sessionId, createdAt: date });
    }
  }

  // Chunk inserts to keep the statement size reasonable.
  for (let i = 0; i < events.length; i += 500) {
    await prisma.analyticsEvent.createMany({ data: events.slice(i, i + 500) });
  }
}

async function main() {
  await seedTemplates();
  await seedDemo();
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
