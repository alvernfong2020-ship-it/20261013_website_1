import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, audit, rateLimitOrThrow } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { assertAiCreditsAvailable } from "@/lib/billing/usage";
import { createJob, executeJob, validateGenerationInput } from "@/lib/ai/generate";
import { providerStatus } from "@/lib/ai/provider";
import { assertSafeUrl, fetchSourceText, extractDocumentText } from "@/lib/ai/source";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  prompt: z.string().trim().max(8000).default(""),
  sourceText: z.string().max(200_000).optional(),
  sourceUrl: z.string().max(2000).optional(),
  sourceAssetId: z.string().optional(),
  audience: z.string().max(200).optional(),
  storyType: z.string().max(40).optional(),
  tone: z.string().max(40).optional(),
  visualStyle: z.string().max(40).optional(),
  brandNotes: z.string().max(4000).optional(),
  assetIds: z.array(z.string()).max(20).optional(),
});

const AI_COST = 5;

/**
 * POST /api/ai/generate
 *
 * Validates input, checks the workspace's credit balance, runs the pipeline and
 * persists the resulting draft. The job row records every step so the client
 * can show progress. A demo result is flagged so the UI can label it honestly.
 */
export const POST = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "EDITOR");
  rateLimitOrThrow(`ai:${ctx.userId}`, 20, 60 * 60 * 1000, "You have started a lot of generations. Please wait a moment.");

  const body = schema.parse(await req.json());

  // Resolve source content from a URL or an uploaded document.
  let sourceText = body.sourceText;
  if (body.sourceUrl) {
    assertSafeUrl(body.sourceUrl);
    const fetched = await fetchSourceText(body.sourceUrl);
    sourceText = [sourceText, fetched.text].filter(Boolean).join("\n\n");
  }
  if (body.sourceAssetId) {
    const asset = await prisma.asset.findFirst({
      where: { id: body.sourceAssetId, workspaceId: ctx.workspace.id },
    });
    if (asset) {
      const bytes = await readAssetBytes(asset.url, asset.storageKey);
      if (bytes) {
        const text = extractDocumentText(bytes, asset.mimeType, asset.filename);
        if (text) sourceText = [sourceText, text].filter(Boolean).join("\n\n");
      }
    }
  }

  const input = {
    prompt: body.prompt,
    sourceText,
    sourceUrl: body.sourceUrl,
    audience: body.audience,
    storyType: body.storyType,
    tone: body.tone,
    visualStyle: body.visualStyle,
    brandNotes: body.brandNotes,
  };

  validateGenerationInput(input);
  await assertAiCreditsAvailable(ctx.workspace.id, ctx.workspace.plan, AI_COST);

  // Gather any chosen asset URLs to attach to generated visual sections.
  let assetUrls: { url: string; alt: string }[] = [];
  if (body.assetIds?.length) {
    const assets = await prisma.asset.findMany({
      where: { id: { in: body.assetIds }, workspaceId: ctx.workspace.id },
    });
    assetUrls = assets.map((a) => ({ url: a.url, alt: a.filename }));
  }

  const status = providerStatus();
  const job = await createJob({
    workspaceId: ctx.workspace.id,
    userId: ctx.userId,
    input: { ...input, assetUrls },
    cost: AI_COST,
  });

  try {
    const story = await executeJob(job.id);
    await audit(ctx.workspace.id, ctx.userId, "ai.generate", job.id, { demo: !status.configured });
    return NextResponse.json(
      {
        jobId: job.id,
        storyId: story?.id,
        demo: !status.configured,
        notice: status.configured ? null : status.notice,
      },
      { status: 201 },
    );
  } catch (error) {
    // executeJob already marked the job FAILED; surface a retryable payload.
    return NextResponse.json(
      {
        jobId: job.id,
        error: (error as Error).message,
        code: "generation_failed",
        retryable: true,
        demo: !status.configured,
        notice: status.configured ? null : status.notice,
      },
      { status: 502 },
    );
  }
});

async function readAssetBytes(url: string, storageKey: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("/uploads/")) {
      const fs = await import("node:fs/promises");
      const path = "/workspace/project/20261013_website_1/public" + url;
      return await fs.readFile(path);
    }
    void storageKey;
  } catch {
    return null;
  }
  return null;
}
