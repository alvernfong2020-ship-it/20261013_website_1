import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { prisma } from "@/lib/db";
import { entitlementsFor } from "@/lib/plans";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/, "Enter a valid hostname like stories.example.com"),
  storyId: z.string().optional(),
});

/** GET /api/domains — list custom domains for the workspace. */
export const GET = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "VIEWER");
  const domains = await prisma.domain.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    domains,
    allowance: entitlementsFor(ctx.workspace.plan).customDomains,
  });
});

/**
 * POST /api/domains — register a domain for verification.
 *
 * Hosting/SSL provisioning depends on deployment infrastructure that is not
 * available here, so this records the intent, generates a verification token
 * and returns DNS instructions. It never claims the domain is live.
 */
export const POST = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "ADMIN");
  const body = addSchema.parse(await req.json());

  const allowance = entitlementsFor(ctx.workspace.plan).customDomains;
  if (allowance === 0) {
    throw new HttpError(402, "Custom domains are not included in this plan.", "plan_required");
  }
  const existingCount = await prisma.domain.count({ where: { workspaceId: ctx.workspace.id } });
  if (existingCount >= allowance) {
    throw new HttpError(402, `This plan allows ${allowance} custom domain(s).`, "domain_limit");
  }
  const taken = await prisma.domain.findUnique({ where: { hostname: body.hostname } });
  if (taken) throw new HttpError(409, "That domain is already registered.", "domain_taken");

  if (body.storyId) {
    const story = await prisma.story.findFirst({
      where: { id: body.storyId, workspaceId: ctx.workspace.id },
      select: { id: true },
    });
    if (!story) throw new HttpError(404, "Story not found in this workspace.", "not_found");
  }

  const token = `scrollwright-verify=${randomBytes(12).toString("hex")}`;
  const domain = await prisma.domain.create({
    data: {
      workspaceId: ctx.workspace.id,
      storyId: body.storyId ?? null,
      hostname: body.hostname,
      status: "pending",
      verificationToken: token,
    },
  });
  await audit(ctx.workspace.id, ctx.userId, "domain.add", domain.id, { hostname: body.hostname });

  return NextResponse.json(
    {
      domain,
      instructions: {
        step1: `Create a CNAME record: ${body.hostname} -> domains.scrollwright.app`,
        step2: `Create a TXT record at _scrollwright.${body.hostname} with the value "${token}"`,
        step3: "Return here and press Verify once DNS has propagated (this can take up to 48 hours).",
        note: "Automatic SSL provisioning and hosting require a configured hosting integration and are not enabled in this environment.",
      },
    },
    { status: 201 },
  );
});
