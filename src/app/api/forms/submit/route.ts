import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, clientIp, rateLimitOrThrow, hashIp } from "@/lib/api";
import { prisma } from "@/lib/db";
import { readDocument } from "@/lib/story/service";
import { HttpError } from "@/lib/auth/authorize";
import { assertStoryFormAllowed } from "@/lib/billing/forms";

export const dynamic = "force-dynamic";

const schema = z.object({
  sectionId: z.string().min(1).max(64),
  storySlug: z.string().min(1).max(120),
  data: z.record(z.string(), z.union([z.string(), z.boolean()])),
  renderedAt: z.string().optional(),
});

/**
 * POST /api/forms/submit — public endpoint for published-story forms.
 * Server-side validation, spam heuristics, rate limiting and consent.
 */
export const POST = handler(async (req: Request) => {
  const ip = clientIp(req);
  rateLimitOrThrow(`form:${ip ?? "anon"}`, 12, 60 * 60 * 1000, "Too many submissions from this network. Please try again later.");

  const body = schema.parse(await req.json());

  const story = await prisma.story.findFirst({
    where: { slug: body.storySlug, status: "PUBLISHED", deletedAt: null },
    select: { id: true, workspaceId: true, document: true, publishedVersionId: true },
  });
  if (!story) throw new HttpError(404, "This form's story is not published.", "not_published");

  await assertStoryFormAllowed(story.workspaceId);

  // Find the section definition to validate against its declared fields.
  const doc = readDocument(story.document);
  const section = doc.sections.find((s) => s.id === body.sectionId && s.type === "contact-form");
  if (!section) throw new HttpError(404, "Form section not found.", "no_section");

  const declared = section.interaction.formFields ?? [];
  const errors: { path: string; message: string }[] = [];
  const clean: Record<string, string> = {};

  for (const field of declared) {
    const raw = body.data[field.name];
    if (field.required && (raw === undefined || raw === "" || raw === false)) {
      errors.push({ path: field.name, message: `${field.label} is required.` });
      continue;
    }
    if (raw === undefined) continue;
    const value = String(raw).trim();
    if (value.length > 4000) {
      errors.push({ path: field.name, message: `${field.label} is too long.` });
      continue;
    }
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push({ path: field.name, message: "Enter a valid email address." });
      continue;
    }
    clean[field.name] = value;
  }

  if (errors.length) {
    return NextResponse.json({ error: "Please correct the highlighted fields.", issues: errors }, { status: 422 });
  }

  if (section.interaction.consentText && !body.data.consent) {
    return NextResponse.json(
      { error: "Please accept the consent checkbox before submitting.", issues: [{ path: "consent", message: "Consent required." }] },
      { status: 422 },
    );
  }

  // Spam heuristics: honeypot filled, or submitted impossibly fast.
  const spam =
    Boolean((body.data as Record<string, unknown>).website) ||
    (body.renderedAt ? Date.now() - Number(body.renderedAt) < 1200 : false);

  const submission = await prisma.formSubmission.create({
    data: {
      storyId: story.id,
      workspaceId: story.workspaceId,
      sectionId: section.id,
      data: clean as object,
      status: spam ? "spam" : "new",
      ipHash: await hashIp(ip),
    },
    select: { id: true, status: true },
  });

  // Record a form_submit analytics event (dedup-safe).
  if (!spam) {
    await prisma.analyticsEvent.create({
      data: {
        storyId: story.id,
        versionId: story.publishedVersionId,
        type: "form_submit",
        sessionId: `form_${submission.id}`,
        sectionId: section.id,
      },
    });
  }

  // Always report success to the visitor; spam is silently quarantined.
  return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
});
