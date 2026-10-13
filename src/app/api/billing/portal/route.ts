import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { resolveWorkspace } from "@/lib/api-workspace";
import { getBillingProvider, billingMode } from "@/lib/billing/provider";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const schema = z.object({ returnUrl: z.string().optional() });

/** POST /api/billing/portal — open the billing management portal. */
export const POST = handler(async (req: Request) => {
  const ctx = await resolveWorkspace(req, "OWNER");
  const body = schema.parse(await req.json().catch(() => ({})));
  const provider = getBillingProvider();
  const result = await provider.createPortal(ctx.workspace.id, body.returnUrl || absoluteUrl("/billing"));
  return NextResponse.json({ url: result.url, mode: billingMode() });
});
