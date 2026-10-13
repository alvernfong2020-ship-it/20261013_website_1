import { NextResponse } from "next/server";
import { promises as dns } from "node:dns";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/domains/[id]/verify — attempt DNS verification.
 * Actually resolves the TXT record, so the status reflects reality.
 */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "ADMIN");
  const domain = await prisma.domain.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!domain) throw new HttpError(404, "Domain not found.", "not_found");

  await prisma.domain.update({ where: { id }, data: { status: "verifying" } });

  let verified = false;
  let detail = "";
  try {
    const records = await dns.resolveTxt(`_scrollwright.${domain.hostname}`);
    const flat = records.map((r) => r.join(""));
    verified = flat.some((r) => r.includes(domain.verificationToken));
    if (!verified) detail = `Found ${flat.length} TXT record(s) but none contained the verification token.`;
  } catch (error) {
    detail = `Could not read the TXT record yet (${(error as NodeJS.ErrnoException).code ?? "lookup failed"}). DNS may not have propagated.`;
  }

  const updated = await prisma.domain.update({
    where: { id },
    data: {
      status: verified ? "active" : "error",
      verifiedAt: verified ? new Date() : null,
    },
  });
  await audit(ctx.workspace.id, ctx.userId, "domain.verify", id, { verified });

  return NextResponse.json({
    domain: updated,
    verified,
    detail: verified
      ? "Domain verified. Point your DNS CNAME at the platform and SSL will be provisioned by your hosting integration."
      : detail,
  });
});

/** DELETE /api/domains/[id] — remove a domain registration. */
export const DELETE = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const ctx = await resolveWorkspace(req, "ADMIN");
  const domain = await prisma.domain.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!domain) throw new HttpError(404, "Domain not found.", "not_found");
  await prisma.domain.delete({ where: { id } });
  await audit(ctx.workspace.id, ctx.userId, "domain.delete", id);
  return NextResponse.json({ ok: true });
});
