import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getStoryForWorkspace } from "@/lib/story/service";
import { summarize } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ storyId: string }> };

/** GET /api/analytics/[storyId]?range=30 — aggregated analytics for a story. */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { storyId } = await params;
  const ctx = await resolveWorkspace(req, "VIEWER");
  await getStoryForWorkspace(storyId, ctx.workspace.id);

  const url = new URL(req.url);
  const range = Math.min(Math.max(Number(url.searchParams.get("range") ?? 30) || 30, 1), 365);

  const summary = await summarize(storyId, range);
  return NextResponse.json({ summary });
});
