/**
 * End-to-end story lifecycle against the real database.
 *
 * Exercises the exact server-side modules the HTTP routes call, so it covers
 * the critical acceptance journey: create from a template, save/autosave,
 * reorder, publish (freeze a version), read the frozen public document, record
 * analytics, edit + republish, and confirm the previous version is recoverable.
 *
 * Uses a throwaway workspace/user and removes them in teardown.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { registerUser } from "@/lib/auth/register";
import {
  publishStory,
  getPublishedDocument,
  saveDraft,
  readDocument,
  unpublishStory,
} from "@/lib/story/service";
import { createEmptyStory, createSection, reorder, duplicateSection } from "@/lib/story/factory";
import { recordEvent, summarize } from "@/lib/analytics";
import { assertPublishAllowance, getUsage } from "@/lib/billing/usage";
import { TEMPLATE_SEEDS } from "@/lib/templates/catalog";

const email = `e2e-${Date.now()}@example.test`;
let userId = "";
let workspaceId = "";

beforeAll(async () => {
  const user = await registerUser({ name: "E2E Tester", email, password: "Password123" }, "127.0.0.1");
  userId = user.id;
  const membership = await prisma.membership.findFirstOrThrow({ where: { userId } });
  workspaceId = membership.workspaceId;
});

afterAll(async () => {
  if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("story lifecycle (integration)", () => {
  it("registers a user and provisions a primary workspace", async () => {
    const membership = await prisma.membership.findFirstOrThrow({ where: { userId } });
    expect(membership.role).toBe("OWNER");
    expect(membership.workspaceId).toBe(workspaceId);
  });

  it("creates a story from a template and persists it as a draft", async () => {
    const seed = TEMPLATE_SEEDS[0];
    const tplRow = await prisma.template.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        slug: seed.slug,
        title: seed.title,
        description: seed.description,
        category: seed.category,
        storyType: seed.storyType as never,
        document: seed.document as object,
        version: seed.version,
        tags: seed.tags,
        isSystem: true,
      },
    });

    const story = await prisma.story.create({
      data: {
        workspaceId,
        authorId: userId,
        title: seed.title,
        slug: `${seed.slug}-${Date.now()}`,
        storyType: seed.storyType as never,
        status: "DRAFT",
        document: tplRow.document as object,
        seo: {},
        templateId: tplRow.id,
      },
    });

    expect(story.status).toBe("DRAFT");
    const doc = readDocument(story.document);
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it("saves edits, detects revision conflicts, and reorders sections", async () => {
    const story = await prisma.story.findFirstOrThrow({ where: { workspaceId } });
    const doc = createEmptyStory({
      title: "Lifecycle",
      slug: `lifecycle-${Date.now()}`,
      sections: [createSection("hero"), createSection("rich-text"), createSection("quote")],
    });

    const saved = await saveDraft({
      storyId: story.id,
      workspaceId,
      document: doc,
      expectedRevision: story.revision,
    });
    expect(saved.revision).toBe(story.revision + 1);

    // Stale revision is rejected — protects against overwriting newer edits.
    await expect(
      saveDraft({ storyId: story.id, workspaceId, document: doc, expectedRevision: story.revision }),
    ).rejects.toThrow(/updated elsewhere/i);

    // Duplicate a section (append) and reorder, then save again.
    const current = readDocument(saved.document);
    current.sections = [...current.sections, duplicateSection(current.sections[0])];
    current.sections = reorder(current.sections, current.sections.length - 1, 0);
    const again = await saveDraft({ storyId: story.id, workspaceId, document: current, expectedRevision: saved.revision });
    expect(again.revision).toBe(saved.revision + 1);
    const after = readDocument(again.document);
    expect(after.sections).toHaveLength(4);
  });

  it("publishes a frozen version, serves it publicly, and records analytics", async () => {
    const story = await prisma.story.findFirstOrThrow({ where: { workspaceId } });
    await assertPublishAllowance(workspaceId, "FREE");

    const { version } = await publishStory(story.id, workspaceId, userId);
    expect(version.version).toBe(1);

    const published = await getPublishedDocument(story.id);
    expect(published).not.toBeNull();
    expect(published?.versionNumber).toBe(1);

    // A visitor triggers events against the published story.
    await recordEvent(story.id, version.id, { type: "page_view", sessionId: "visitor-1" }, "8.8.8.8", "Mozilla/5.0");
    await recordEvent(story.id, version.id, { type: "page_view", sessionId: "visitor-1" }, "8.8.8.8", "Mozilla/5.0"); // dedupe
    await recordEvent(story.id, version.id, { type: "cta_click", sessionId: "visitor-1" }, "8.8.8.8", "Mozilla/5.0");

    const summary = await summarize(story.id, 30);
    expect(summary.pageViews).toBe(1); // repeated observer callback not double-counted
    expect(summary.uniqueVisitors).toBe(1);
    expect(summary.ctaClicks).toBe(1);
  });

  it("editing the draft does not corrupt the published version, and a republish is recoverable", async () => {
    const story = await prisma.story.findFirstOrThrow({ where: { workspaceId } });
    const beforeEdit = await getPublishedDocument(story.id);
    expect(beforeEdit?.document.title).toBeTruthy();

    // Edit the draft after publishing.
    const draftDoc = readDocument(story.document);
    draftDoc.title = "Lifecycle v2";
    draftDoc.sections = [...draftDoc.sections, createSection("statistics")];
    await saveDraft({ storyId: story.id, workspaceId, document: draftDoc, expectedRevision: story.revision });

    // The public document is unchanged until we republish.
    const stillOld = await getPublishedDocument(story.id);
    expect(stillOld?.document.title).toBe(beforeEdit?.document.title);

    // Republish -> version 2.
    const live = await prisma.story.findFirstOrThrow({ where: { workspaceId } });
    const { version } = await publishStory(live.id, workspaceId, userId);
    expect(version.version).toBe(2);

    // Both versions remain recoverable.
    const versions = await prisma.storyVersion.findMany({ where: { storyId: story.id }, orderBy: { version: "asc" } });
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
    expect(readDocument(versions[0].document).title).not.toBe("Lifecycle v2");
  });

  it("enforces the publish limit on the Free plan", async () => {
    // Free plan allows a single published story; the one above is still live.
    const usage = await getUsage(workspaceId, "FREE");
    expect(usage.publishedCount).toBeGreaterThanOrEqual(1);
    await expect(assertPublishAllowance(workspaceId, "FREE")).rejects.toThrow(/limit/i);
  });

  it("unpublishing frees the public URL", async () => {
    const story = await prisma.story.findFirstOrThrow({ where: { workspaceId } });
    await unpublishStory(story.id, workspaceId);
    const gone = await getPublishedDocument(story.id);
    expect(gone).toBeNull();
    await expect(assertPublishAllowance(workspaceId, "FREE")).resolves.toBeUndefined();
  });
});
