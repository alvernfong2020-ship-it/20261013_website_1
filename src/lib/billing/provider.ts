import { prisma } from "@/lib/db";
import { PLAN_DEFINITIONS, type PlanId } from "@/lib/plans";
import { HttpError } from "@/lib/auth/authorize";
import type { Plan } from "@prisma/client";

/**
 * Billing provider interface.
 *
 * Stripe is implemented behind this interface. When no provider credentials
 * are configured, the app runs in an explicitly-labelled DEVELOPMENT BILLING
 * mode where plan changes are applied locally and no money moves. The UI and
 * API both surface which mode is active.
 */

export type BillingMode = "live" | "development";

export function billingMode(): BillingMode {
  return process.env.STRIPE_SECRET_KEY ? "live" : "development";
}

export function priceIdFor(plan: PlanId, cycle: "monthly" | "yearly"): string | null {
  // Stripe price ids are configured through env vars per plan/cycle.
  const key = `STRIPE_PRICE_${plan}_${cycle.toUpperCase()}`;
  return process.env[key] || null;
}

export interface BillingProvider {
  readonly name: string;
  createCheckout(params: {
    workspaceId: string;
    plan: PlanId;
    cycle: "monthly" | "yearly";
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<{ url: string; providerRef: string }>;
  createPortal(workspaceId: string, returnUrl: string): Promise<{ url: string }>;
}

// ---------------------------------------------------------------------------
// Development provider — no external calls, no money.
// ---------------------------------------------------------------------------

class DevelopmentProvider implements BillingProvider {
  readonly name = "development";

  async createCheckout(params: {
    workspaceId: string;
    plan: PlanId;
    cycle: "monthly" | "yearly";
    successUrl: string;
    cancelUrl: string;
  }) {
    // Apply the plan change directly and send the user straight back.
    await applyPlanChange(params.workspaceId, params.plan, params.cycle, "development");
    const url = `${params.successUrl}${params.successUrl.includes("?") ? "&" : "?"}dev=1`;
    return { url, providerRef: `dev_${Date.now().toString(36)}` };
  }

  async createPortal(_workspaceId: string, returnUrl: string) {
    return { url: returnUrl };
  }
}

// ---------------------------------------------------------------------------
// Stripe provider
// ---------------------------------------------------------------------------

class StripeProvider implements BillingProvider {
  readonly name = "stripe";

  private async stripe() {
    const specifier = "stripe";
    const mod = (await import(/* webpackIgnore: true */ specifier)) as {
      default: new (key: string, cfg?: unknown) => {
        checkout: { sessions: { create: (o: unknown) => Promise<{ url: string; id: string }> } };
        billingPortal: { sessions: { create: (o: unknown) => Promise<{ url: string }> } };
        customers: { create: (o: unknown) => Promise<{ id: string }> };
      };
    };
    return new mod.default(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
  }

  async createCheckout(params: {
    workspaceId: string;
    plan: PlanId;
    cycle: "monthly" | "yearly";
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }) {
    const priceId = priceIdFor(params.plan, params.cycle);
    if (!priceId) {
      throw new HttpError(
        400,
        `No Stripe price is configured for the ${PLAN_DEFINITIONS[params.plan].name} plan (${params.cycle}). Set STRIPE_PRICE_${params.plan}_${params.cycle.toUpperCase()}.`,
        "missing_price",
      );
    }
    const stripe = await this.stripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail,
      client_reference_id: params.workspaceId,
      metadata: { workspaceId: params.workspaceId, plan: params.plan, cycle: params.cycle },
    });
    return { url: session.url, providerRef: session.id };
  }

  async createPortal(workspaceId: string, returnUrl: string) {
    const sub = await prisma.subscription.findFirst({ where: { workspaceId } });
    if (!sub?.providerRef) {
      throw new HttpError(400, "No billing account is linked to this workspace yet.", "no_customer");
    }
    const stripe = await this.stripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.providerRef,
      return_url: returnUrl,
    });
    return { url: session.url };
  }
}

export function getBillingProvider(): BillingProvider {
  return process.env.STRIPE_SECRET_KEY ? new StripeProvider() : new DevelopmentProvider();
}

// ---------------------------------------------------------------------------
// Plan changes (server-side, idempotent)
// ---------------------------------------------------------------------------

export async function applyPlanChange(
  workspaceId: string,
  plan: PlanId,
  cycle: "monthly" | "yearly",
  provider: string,
  providerRef?: string,
) {
  const periodEnd = new Date();
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + (cycle === "yearly" ? 12 : 1));

  await prisma.$transaction([
    prisma.workspace.update({ where: { id: workspaceId }, data: { plan: plan as Plan } }),
    prisma.subscription.create({
      data: {
        workspaceId,
        plan: plan as Plan,
        status: "active",
        billingCycle: cycle,
        provider,
        providerRef: providerRef ?? null,
        currentPeriodEnd: periodEnd,
      },
    }),
  ]);
}
