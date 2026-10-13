import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, audit } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getBillingProvider, billingMode } from "@/lib/billing/provider";
import { getOptionalUser } from "@/lib/auth/authorize";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  plan: z.enum(["STARTER", "PRO", "PRO_PLUS"]),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

/** POST /api/billing/checkout — start a subscription upgrade. */
export const POST = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "OWNER");
  const body = schema.parse(await req.json());
  const user = await getOptionalUser();

  const provider = getBillingProvider();
  const result = await provider.createCheckout({
    workspaceId: ctx.workspace.id,
    plan: body.plan,
    cycle: body.cycle,
    successUrl: absoluteUrl("/billing?upgraded=1"),
    cancelUrl: absoluteUrl("/billing?cancelled=1"),
    customerEmail: user?.email,
  });

  await audit(ctx.workspace.id, ctx.userId, "billing.checkout", ctx.workspace.id, {
    plan: body.plan,
    cycle: body.cycle,
    mode: billingMode(),
  });

  return NextResponse.json({ url: result.url, mode: billingMode() });
});
