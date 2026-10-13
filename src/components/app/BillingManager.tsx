"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, Stat } from "@/components/ui/primitives";
import { ConfirmDialog, useToast } from "@/components/ui/overlays";
import { api } from "@/lib/client";
import { PLAN_DEFINITIONS, PLAN_ORDER, formatPrice, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function BillingManager({
  mode,
  plan,
  cycle,
  seats,
  canManage,
  usage,
  subscription,
}: {
  mode: "live" | "development";
  plan: PlanId;
  cycle: "monthly" | "yearly";
  seats: number;
  canManage: boolean;
  usage: {
    aiCreditsUsed: number;
    aiCreditsLimit: number;
    publishedCount: number;
    publishedLimit: number;
    formSubmissionsUsed: number;
    formSubmissionsLimit: number;
  };
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string;
  } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(cycle);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function choose(planId: PlanId) {
    if (!canManage) {
      toast.push({ title: "Only workspace owners can change the plan.", tone: "info" });
      return;
    }
    setBusy(planId);
    try {
      const res = await api<{ url: string; mode: string }>("/api/billing/checkout", {
        method: "POST",
        json: { plan: planId, cycle: billingCycle },
      });
      if (res.mode === "development") {
        toast.push({
          title: "Plan updated (development billing)",
          description: "No payment provider is configured, so no money moved.",
          tone: "info",
        });
        router.refresh();
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      toast.push({ title: "Could not change plan", description: (e as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    try {
      const res = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
      if (res.url) window.location.href = res.url;
    } catch (e) {
      toast.push({ title: "Could not open billing portal", description: (e as Error).message, tone: "error" });
    }
  }

  async function cancel() {
    setCancelOpen(false);
    try {
      await api("/api/billing/cancel", { method: "POST" });
      toast.push({ title: "Subscription will end at the period end", tone: "info" });
      router.refresh();
    } catch (e) {
      toast.push({ title: "Could not cancel", description: (e as Error).message, tone: "error" });
    }
  }

  return (
    <div>
      <Alert tone={mode === "live" ? "success" : "info"} title={mode === "live" ? "Live billing" : "Development billing mode"}>
        {mode === "live"
          ? "Payments are processed by the configured provider."
          : "No payment provider is configured. Plan changes are applied locally for testing and no money moves. Set STRIPE_SECRET_KEY and price ids to enable live billing."}
      </Alert>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="AI credits" value={`${usage.aiCreditsUsed} / ${usage.aiCreditsLimit === Infinity ? "∞" : usage.aiCreditsLimit}`} hint="This month" />
        <Stat label="Published" value={`${usage.publishedCount} / ${usage.publishedLimit === Infinity ? "∞" : usage.publishedLimit}`} hint={`${seats} seat${seats === 1 ? "" : "s"}`} />
        <Stat label="Form submissions" value={`${usage.formSubmissionsUsed} / ${usage.formSubmissionsLimit === Infinity ? "∞" : usage.formSubmissionsLimit}`} />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Subscription</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Current plan: <span className="font-medium capitalize">{plan.toLowerCase().replace("_", "+")}</span>
              {subscription && (
                <>
                  {" · "}
                  <Badge tone={subscription.status === "active" ? "success" : "warning"}>{subscription.status}</Badge>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-line p-0.5" role="group" aria-label="Billing cycle">
              {(["monthly", "yearly"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={billingCycle === c}
                  onClick={() => setBillingCycle(c)}
                  className={cn("rounded-full px-3 py-1 text-xs capitalize", billingCycle === c ? "bg-ink text-paper" : "text-ink-soft")}
                >
                  {c}
                </button>
              ))}
            </div>
            {mode === "live" && (
              <Button variant="secondary" size="sm" onClick={openPortal}>
                Manage in portal
              </Button>
            )}
            {plan !== "FREE" && canManage && (
              <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
        {subscription?.currentPeriodEnd && (
          <p className="mt-2 text-xs text-ink-faint">
            {subscription.cancelAtPeriodEnd ? "Access ends" : "Renews"}{" "}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
      </Card>

      <h2 className="mt-10 font-display text-2xl">Plans</h2>
      <p className="mt-1 text-sm text-ink-soft">Example pricing until commercial terms are finalised.</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const p = PLAN_DEFINITIONS[id];
          const price = billingCycle === "monthly" ? p.monthlyPrice : p.yearlyPrice;
          const current = id === plan;
          return (
            <li key={id}>
              <Card className={cn("flex h-full flex-col p-4", current && "border-accent")}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg">{p.name}</h3>
                  {current && <Badge tone="accent">current</Badge>}
                </div>
                <p className="mt-1 text-xs text-ink-soft">{p.tagline}</p>
                <p className="mt-3 font-display text-2xl">
                  {price === 0 ? "Free" : formatPrice(price)}
                  {price !== 0 && <span className="text-sm text-ink-faint">/{billingCycle === "monthly" ? "mo" : "yr"}</span>}
                </p>
                <ul className="mt-3 flex-1 space-y-1.5 text-xs text-ink-soft">
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={current ? "ghost" : "primary"}
                  disabled={current || !canManage}
                  loading={busy === id}
                  onClick={() => choose(id)}
                >
                  {current ? "Current plan" : `Switch to ${p.name}`}
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>

      {!canManage && (
        <p className="mt-4 text-xs text-ink-faint">Only the workspace owner can change the subscription.</p>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        title="Cancel subscription?"
        description="The plan stays active until the end of the current period, then reverts to Free."
        confirmLabel="Cancel subscription"
        tone="danger"
      />
    </div>
  );
}
