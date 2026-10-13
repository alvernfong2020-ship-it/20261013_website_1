import { NextResponse } from "next/server";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { prisma } from "@/lib/db";
import { billingMode } from "@/lib/billing/provider";
import { HttpError } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/cancel — schedule cancellation at period end.
 *
 * In live mode the provider portal performs the cancellation and the webhook
 * applies it, so card data never touches this application.
 */
export const POST = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "OWNER");
  const sub = await prisma.subscription.findFirst({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) throw new HttpError(404, "There is no active subscription to cancel.", "no_subscription");

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  await audit(ctx.workspace.id, ctx.userId, "billing.cancel", ctx.workspace.id, { mode: billingMode() });
  return NextResponse.json({ ok: true, cancelAtPeriodEnd: updated.cancelAtPeriodEnd, mode: billingMode() });
});
