import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/ai/jobs/[id] — poll generation progress. */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "VIEWER");
  const job = await prisma.generationJob.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!job) throw new HttpError(404, "Generation job not found.", "not_found");

  return NextResponse.json({
    id: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    error: job.error,
    demo: job.demo,
    storyId: job.storyId,
    output: job.output,
  });
});

/** DELETE /api/ai/jobs/[id] — cancel a job that has not finished. */
export const DELETE = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "EDITOR");
  const job = await prisma.generationJob.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!job) throw new HttpError(404, "Generation job not found.", "not_found");
  if (job.status === "SUCCEEDED" || job.status === "FAILED") {
    throw new HttpError(409, "That job has already finished and cannot be cancelled.", "job_finished");
  }
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
