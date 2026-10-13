import { prisma } from "@/lib/db";
import { hashIp } from "@/lib/api";

/**
 * First-party analytics.
 *
 * Event schema (all events share these fields):
 *   type       page_view | section_view | scroll_depth | cta_click | form_submit
 *   storyId    the story the event belongs to
 *   sessionId  a random per-visit id held in sessionStorage (not a cookie,
 *              no cross-site tracking, no PII)
 *   sectionId  optional, for section-level events
 *   value      optional numeric (e.g. scroll depth %)
 *
 * Deduplication: the collector rejects an event when the same
 * (sessionId, type, sectionId) triple has already been recorded, so repeated
 * IntersectionObserver callbacks do not inflate counts.
 */

export const EVENT_TYPES = ["page_view", "section_view", "scroll_depth", "cta_click", "form_submit"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type IncomingEvent = {
  type: EventType;
  sessionId: string;
  sectionId?: string;
  value?: number;
  path?: string;
  referrer?: string;
};

export async function recordEvent(
  storyId: string,
  versionId: string | null,
  event: IncomingEvent,
  ip: string | null,
  userAgent: string | null,
) {
  if (!EVENT_TYPES.includes(event.type)) return { skipped: "unknown_type" };

  // Deduplicate: one event per (session, type, section) — except scroll_depth,
  // where we keep the deepest reading by updating the existing row.
  const existing = await prisma.analyticsEvent.findFirst({
    where: {
      storyId,
      sessionId: event.sessionId,
      type: event.type,
      sectionId: event.sectionId ?? null,
    },
    select: { id: true, value: true },
  });

  if (event.type === "scroll_depth") {
    if (existing) {
      if ((event.value ?? 0) > (existing.value ?? 0)) {
        await prisma.analyticsEvent.update({
          where: { id: existing.id },
          data: { value: event.value },
        });
      }
      return { deduped: true };
    }
  } else if (existing) {
    return { deduped: true };
  }

  const ipHash = await hashIp(ip);
  const device = detectDevice(userAgent);

  await prisma.analyticsEvent.create({
    data: {
      storyId,
      versionId,
      type: event.type,
      sessionId: event.sessionId.slice(0, 64),
      sectionId: event.sectionId?.slice(0, 64),
      value: event.value,
      path: event.path?.slice(0, 200),
      referrer: event.referrer?.slice(0, 200),
      device,
    },
  });
  void ipHash;
  return { ok: true };
}

function detectDevice(ua: string | null): string {
  if (!ua) return "unknown";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export type AnalyticsSummary = {
  rangeDays: number;
  pageViews: number;
  uniqueVisitors: number;
  avgEngagementSeconds: number;
  scrollDepth: { bucket: string; count: number }[];
  sectionViews: { sectionId: string; views: number }[];
  ctaClicks: number;
  formSubmissions: number;
  trend: { date: string; pageViews: number; visitors: number }[];
  demo: boolean;
};

export async function summarize(storyId: string, rangeDays: number): Promise<AnalyticsSummary> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - rangeDays);
  since.setUTCHours(0, 0, 0, 0);

  const [events, story, submissions] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { storyId, createdAt: { gte: since } },
      select: { type: true, sessionId: true, sectionId: true, value: true, createdAt: true },
    }),
    prisma.story.findUnique({
      where: { id: storyId },
      select: { workspace: { select: { settings: true } } },
    }),
    prisma.formSubmission.count({ where: { storyId, createdAt: { gte: since } } }),
  ]);

  const pageViewEvents = events.filter((e) => e.type === "page_view");
  const sessions = new Set(events.map((e) => e.sessionId));

  // Approximate engagement from deepest scroll depth per session (a documented
  // proxy, not a precise time-on-page measurement).
  const depthBySession = new Map<string, number>();
  for (const e of events) {
    if (e.type === "scroll_depth") {
      depthBySession.set(e.sessionId, Math.max(depthBySession.get(e.sessionId) ?? 0, e.value ?? 0));
    }
  }
  const avgDepth =
    depthBySession.size > 0
      ? [...depthBySession.values()].reduce((a, b) => a + b, 0) / depthBySession.size
      : 0;
  // Map average depth onto an estimated seconds figure (12s per 10% depth).
  const avgEngagementSeconds = Math.round((avgDepth / 10) * 12);

  const buckets = ["0-25", "25-50", "50-75", "75-100"];
  const scrollDepth = buckets.map((bucket, i) => ({
    bucket,
    count: [...depthBySession.values()].filter(
      (v) => v > i * 25 && v <= (i + 1) * 25 + (i === 0 ? 1 : 0),
    ).length,
  }));

  const sectionCounts = new Map<string, number>();
  for (const e of events) {
    if (e.type === "section_view" && e.sectionId) {
      sectionCounts.set(e.sectionId, (sectionCounts.get(e.sectionId) ?? 0) + 1);
    }
  }

  // Daily trend
  const byDay = new Map<string, { views: number; sessions: Set<string> }>();
  for (let d = rangeDays; d >= 0; d--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - d);
    byDay.set(date.toISOString().slice(0, 10), { views: 0, sessions: new Set() });
  }
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    if (!entry) continue;
    if (e.type === "page_view") entry.views += 1;
    entry.sessions.add(e.sessionId);
  }

  const settings = story?.workspace.settings as { isDemo?: boolean } | null;

  return {
    rangeDays,
    pageViews: pageViewEvents.length,
    uniqueVisitors: sessions.size,
    avgEngagementSeconds,
    scrollDepth,
    sectionViews: [...sectionCounts.entries()]
      .map(([sectionId, views]) => ({ sectionId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20),
    ctaClicks: events.filter((e) => e.type === "cta_click").length,
    formSubmissions: submissions,
    trend: [...byDay.entries()].map(([date, v]) => ({
      date,
      pageViews: v.views,
      visitors: v.sessions.size,
    })),
    demo: Boolean(settings?.isDemo),
  };
}
