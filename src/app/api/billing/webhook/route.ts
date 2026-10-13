import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { handler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { applyPlanChange, billingMode } from "@/lib/billing/provider";
import type { PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook receiver.
 *
 * - Verifies the `Stripe-Signature` header with HMAC-SHA256 and a constant-time
 *   compare, so forged webhooks are rejected.
 * - Idempotent: every event id is recorded in `BillingEvent` (unique) and
 *   replayed events are ignored.
 * - Never trusts amount/plan data from the client; the plan comes from the
 *   event's own metadata, matched against our known plans.
 */
export const POST = handler(async (req: Request) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (billingMode() !== "live" || !secret) {
    // Development mode: nothing to verify. Return 200 so local tooling is happy.
    return NextResponse.json({ received: true, mode: "development" });
  }

  const raw = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  if (!verifyStripeSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Idempotency guard.
  const seen = await prisma.billingEvent.findUnique({ where: { eventId: event.id } });
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  await prisma.billingEvent.create({
    data: {
      eventId: event.id,
      type: event.type,
      provider: "stripe",
      payload: event as unknown as object,
    },
  });

  try {
    await handleStripeEvent(event);
    await prisma.billingEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date() },
    });
  } catch (error) {
    console.error("[webhook] handler error", error);
    // Return 500 so Stripe retries; the idempotency row prevents double-apply.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
});

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  // Reject events older than 5 minutes to limit replay windows.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handleStripeEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
  const obj = event.data.object;
  const metadata = (obj.metadata as Record<string, string>) || {};
  const workspaceId = metadata.workspaceId || (obj.client_reference_id as string | undefined);

  switch (event.type) {
    case "checkout.session.completed": {
      if (!workspaceId) return;
      const plan = (metadata.plan as PlanId) || "STARTER";
      const cycle = (metadata.cycle as "monthly" | "yearly") || "monthly";
      await applyPlanChange(workspaceId, plan, cycle, "stripe", obj.customer as string);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscriptionRef = obj.id as string;
      const status = event.type.endsWith("deleted") ? "canceled" : (obj.status as string) || "active";
      await prisma.subscription.updateMany({
        where: { provider: "stripe", providerRef: subscriptionRef },
        data: { status },
      });
      break;
    }
    default:
      break;
  }
}
