import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getStoryForWorkspace } from "@/lib/story/service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ storyId: string }> };

/** GET /api/forms/[storyId] — submissions for a story (excludes spam by default). */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { storyId } = await params;
  const ctx = await resolveWorkspace(req, "VIEWER");
  await getStoryForWorkspace(storyId, ctx.workspace.id);

  const url = new URL(req.url);
  const includeSpam = url.searchParams.get("includeSpam") === "1";

  const submissions = await prisma.formSubmission.findMany({
    where: { storyId, workspaceId: ctx.workspace.id, ...(includeSpam ? {} : { status: { not: "spam" } }) },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ submissions });
});

/** PATCH /api/forms/[storyId] — update a submission's status. */
export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { storyId } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  await getStoryForWorkspace(storyId, ctx.workspace.id);

  const body = (await req.json()) as { id?: string; status?: string };
  if (!body.id || !["new", "read", "spam"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "Provide an id and a valid status." }, { status: 422 });
  }
  const updated = await prisma.formSubmission.update({
    where: { id: body.id },
    data: { status: body.status },
  });
  await audit(ctx.workspace.id, ctx.userId, "form.status", updated.id, { status: body.status });
  return NextResponse.json({ submission: updated });
});
