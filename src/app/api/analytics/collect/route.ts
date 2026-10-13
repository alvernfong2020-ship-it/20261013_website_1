import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, clientIp, rateLimit } from "@/lib/api";
import { recordEvent, EVENT_TYPES } from "@/lib/analytics";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().min(1).max(120),
  type: z.enum(EVENT_TYPES),
  sessionId: z.string().min(6).max(64),
  sectionId: z.string().max(64).optional(),
  value: z.number().optional(),
  path: z.string().max(200).optional(),
  referrer: z.string().max(200).optional(),
});

/**
 * POST /api/analytics/collect — public, first-party event collection.
 * Deliberately tolerant: bad events are dropped rather than erroring the page.
 */
export const POST = handler(async (req: Request) => {
  const ip = clientIp(req);
  // Generous but bounded, so a single client cannot flood the table.
  const limited = rateLimit(`analytics:${ip ?? "anon"}`, 240, 60 * 1000);
  if (!limited.ok) return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_event" }, { status: 400 });
  }
  const body = parsed.data;

  const story = await prisma.story.findFirst({
    where: { slug: body.slug },
    select: { id: true, status: true, publishedVersionId: true },
  });
  if (!story || story.status !== "PUBLISHED") {
    return NextResponse.json({ ok: false, reason: "not_published" }, { status: 404 });
  }

  await recordEvent(
    story.id,
    story.publishedVersionId,
    {
      type: body.type,
      sessionId: body.sessionId,
      sectionId: body.sectionId,
      value: body.value,
      path: body.path,
      referrer: body.referrer,
    },
    ip,
    req.headers.get("user-agent"),
  );

  return NextResponse.json({ ok: true });
});
