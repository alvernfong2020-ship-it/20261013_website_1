import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";
import { slugify } from "@/lib/utils";
import { parseStoryDocument, type StoryDocument } from "./schema";

/**
 * Server-side story operations.
 *
 * All access goes through here so ownership, slug uniqueness, revision
 * handling and validation are applied consistently.
 */

export async function uniqueSlug(workspaceId: string, base: string, excludeStoryId?: string) {
  const root = slugify(base) || "story";
  let candidate = root;
  let n = 1;
  // Bounded loop; falls back to a random suffix if the namespace is saturated.
  for (let i = 0; i < 50; i++) {
    const existing = await prisma.story.findFirst({
      where: { workspaceId, slug: candidate, ...(excludeStoryId ? { id: { not: excludeStoryId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${root}-${n++}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function getStoryForWorkspace(storyId: string, workspaceId: string) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, workspaceId, deletedAt: null },
  });
  if (!story) throw new HttpError(404, "Story not found.", "not_found");
  return story;
}

/** Parse + validate a stored document; throws a clear error if corrupt. */
export function readDocument(raw: unknown): StoryDocument {
  const parsed = parseStoryDocument(raw);
  if (!parsed.ok) {
    throw new HttpError(
      500,
      `This story's saved data is invalid and cannot be rendered: ${parsed.errors.slice(0, 2).join("; ")}`,
      "corrupt_document",
    );
  }
  return parsed.value;
}

/**
 * Save a draft with optimistic concurrency control.
 *
 * `expectedRevision` is the revision the client last saw. If the stored
 * revision is newer, the save is rejected with 409 so the client can reload
 * instead of silently overwriting a newer edit.
 */
export async function saveDraft(params: {
  storyId: string;
  workspaceId: string;
  document: StoryDocument;
  title?: string;
  description?: string;
  expectedRevision?: number;
}) {
  const story = await getStoryForWorkspace(params.storyId, params.workspaceId);

  if (params.expectedRevision !== undefined && story.revision !== params.expectedRevision) {
    throw new HttpError(
      409,
      "This story was updated elsewhere since you last opened it. Reload to get the latest version before saving.",
      "revision_conflict",
    );
  }

  const parsed = parseStoryDocument(params.document);
  if (!parsed.ok) {
    throw new HttpError(422, `The story data failed validation: ${parsed.errors.slice(0, 3).join("; ")}`, "invalid_document");
  }
  const doc = parsed.value;
  doc.updatedAt = new Date().toISOString();

  const title = (params.title ?? doc.title).slice(0, 240) || "Untitled story";
  doc.title = title;

  const slug = doc.slug !== story.slug ? await uniqueSlug(params.workspaceId, doc.slug, story.id) : story.slug;
  doc.slug = slug;

  const updated = await prisma.story.update({
    where: { id: story.id },
    data: {
      title,
      slug,
      description: params.description ?? doc.description,
      document: doc as object,
      seo: doc.seo as object,
      theme: doc.theme,
      revision: { increment: 1 },
    },
  });

  return updated;
}

/** Publish: freeze the current document into a version and set status. */
export async function publishStory(storyId: string, workspaceId: string, userId: string) {
  const story = await getStoryForWorkspace(storyId, workspaceId);
  const doc = readDocument(story.document);
  const parsed = parseStoryDocument(doc);
  if (!parsed.ok) throw new HttpError(422, "Fix validation errors before publishing.", "invalid_document");

  const lastVersion = await prisma.storyVersion.findFirst({
    where: { storyId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const version = await prisma.storyVersion.create({
    data: {
      storyId,
      version: (lastVersion?.version ?? 0) + 1,
      document: parsed.value as object,
      title: story.title,
      description: story.description,
      seo: parsed.value.seo as object,
      createdBy: userId,
    },
  });

  const updated = await prisma.story.update({
    where: { id: storyId },
    data: { status: "PUBLISHED", publishedVersionId: version.id },
  });

  return { story: updated, version };
}

export async function unpublishStory(storyId: string, workspaceId: string) {
  await getStoryForWorkspace(storyId, workspaceId);
  return prisma.story.update({
    where: { id: storyId },
    data: { status: "DRAFT" },
  });
}

/** The frozen document served at the public URL (never the live draft). */
export async function getPublishedDocument(storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!story || story.status !== "PUBLISHED") return null;
  const version = story.publishedVersionId
    ? await prisma.storyVersion.findUnique({ where: { id: story.publishedVersionId } })
    : story.versions[0];
  if (!version) return null;
  return {
    story,
    document: readDocument(version.document),
    versionNumber: version.version,
  };
}

export async function listStories(workspaceId: string, opts: { status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; q?: string; limit?: number } = {}) {
  return prisma.story.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q ? { OR: [{ title: { contains: opts.q, mode: "insensitive" } }, { description: { contains: opts.q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: opts.limit ?? 60,
    include: { _count: { select: { versions: true } } },
  });
}
