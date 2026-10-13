"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_DEFINITIONS, PLAN_ORDER, formatPrice } from "@/lib/plans";
import { ButtonLink, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Pricing cards driven entirely by the central plan configuration.
 * Prices are example values and labelled as such — nothing here charges money.
 */
export function PricingCards({ compact = false }: { compact?: boolean }) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <div>
      <div className="mb-10 flex flex-col items-center gap-3">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex rounded-full border border-line bg-paper-raised p-1"
        >
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cycle === c}
              onClick={() => setCycle(c)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors",
                cycle === c ? "bg-ink text-paper" : "text-ink-soft hover:text-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-faint">
          Example pricing for illustration. Yearly billing is shown as a total (2 months free).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLAN_DEFINITIONS[id];
          const price = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-paper-raised p-6",
                plan.highlight ? "border-accent shadow-md" : "border-line",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6">
                  <Badge tone="accent">Most popular</Badge>
                </span>
              )}
              <h3 className="font-display text-2xl">{plan.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{plan.tagline}</p>
              <p className="mt-5 font-display text-4xl">
                {formatPrice(price)}
                <span className="ml-1 text-sm font-normal text-ink-faint">
                  {price === 0 ? "" : cycle === "monthly" ? "/mo" : "/yr"}
                </span>
              </p>
              {!compact && (
                <ul className="mt-6 space-y-2.5 text-sm text-ink-soft">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 pt-2">
                <ButtonLink
                  href={id === "FREE" ? "/sign-up" : `/sign-up?plan=${id}&cycle=${cycle}`}
                  variant={plan.highlight ? "primary" : "secondary"}
                  className="w-full"
                >
                  {id === "FREE" ? "Start free" : `Choose ${plan.name}`}
                </ButtonLink>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-ink-faint">
        No payment provider is connected in this environment, so plan changes run in a clearly
        labelled development billing mode. See{" "}
        <Link href="/faq" className="text-accent underline underline-offset-2">
          the FAQ
        </Link>
        .
      </p>
    </div>
  );
}
