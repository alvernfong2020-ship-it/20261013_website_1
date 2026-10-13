import type { Plan } from "@prisma/client";

/**
 * Central pricing configuration.
 *
 * Prices are EXAMPLE values and clearly labelled as such in the UI until real
 * commercial terms are decided. Nothing here charges money: billing is wired
 * through `src/lib/billing` and only becomes live when a payment provider is
 * configured. Entitlements below are enforced server-side.
 */

export type PlanId = "FREE" | "STARTER" | "PRO" | "PRO_PLUS";

export type Entitlements = {
  /** AI generation credits per month. */
  aiCredits: number;
  /** Max simultaneously published stories. */
  publishedStories: number;
  customDomains: number;
  removeWatermark: boolean;
  teamCollaboration: boolean;
  teamSeats: number;
  formSubmissionsPerMonth: number;
  interactiveComponents: boolean;
  exportEnabled: boolean;
  prioritySupport: boolean;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  /** Example monthly price in cents. */
  monthlyPrice: number;
  yearlyPrice: number; // billed as a yearly total
  highlight?: boolean;
  features: string[];
  entitlements: Entitlements;
};

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "Explore the studio and publish your first story.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "20 AI credits / month",
      "1 published story",
      "Core section library",
      "Scrollytelling engine",
      "Community templates",
      "Scrollytelling footer badge",
    ],
    entitlements: {
      aiCredits: 20,
      publishedStories: 1,
      customDomains: 0,
      removeWatermark: false,
      teamCollaboration: false,
      teamSeats: 1,
      formSubmissionsPerMonth: 50,
      interactiveComponents: false,
      exportEnabled: false,
      prioritySupport: false,
    },
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    tagline: "For creators shipping regularly.",
    monthlyPrice: 1600,
    yearlyPrice: 16000,
    features: [
      "200 AI credits / month",
      "5 published stories",
      "All section types",
      "Interactive components",
      "500 form submissions / month",
      "Remove footer badge",
    ],
    entitlements: {
      aiCredits: 200,
      publishedStories: 5,
      customDomains: 0,
      removeWatermark: true,
      teamCollaboration: false,
      teamSeats: 1,
      formSubmissionsPerMonth: 500,
      interactiveComponents: true,
      exportEnabled: false,
      prioritySupport: false,
    },
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "For teams building a content practice.",
    monthlyPrice: 3900,
    yearlyPrice: 39000,
    highlight: true,
    features: [
      "1,000 AI credits / month",
      "25 published stories",
      "1 custom domain",
      "5 team seats",
      "5,000 form submissions / month",
      "Export to static bundle",
      "Priority support",
    ],
    entitlements: {
      aiCredits: 1000,
      publishedStories: 25,
      customDomains: 1,
      removeWatermark: true,
      teamCollaboration: true,
      teamSeats: 5,
      formSubmissionsPerMonth: 5000,
      interactiveComponents: true,
      exportEnabled: true,
      prioritySupport: true,
    },
  },
  PRO_PLUS: {
    id: "PRO_PLUS",
    name: "Pro+",
    tagline: "For agencies and large content operations.",
    monthlyPrice: 8900,
    yearlyPrice: 89000,
    features: [
      "5,000 AI credits / month",
      "Unlimited published stories",
      "5 custom domains",
      "20 team seats",
      "50,000 form submissions / month",
      "White-label published pages",
      "Dedicated support",
    ],
    entitlements: {
      aiCredits: 5000,
      publishedStories: Infinity,
      customDomains: 5,
      removeWatermark: true,
      teamCollaboration: true,
      teamSeats: 20,
      formSubmissionsPerMonth: 50000,
      interactiveComponents: true,
      exportEnabled: true,
      prioritySupport: true,
    },
  },
};

export function planFor(plan: Plan | string | null | undefined): PlanDefinition {
  const id = (plan ?? "FREE") as PlanId;
  return PLAN_DEFINITIONS[id] ?? PLAN_DEFINITIONS.FREE;
}

export function entitlementsFor(plan: Plan | string | null | undefined): Entitlements {
  return planFor(plan).entitlements;
}

export const PLAN_ORDER: PlanId[] = ["FREE", "STARTER", "PRO", "PRO_PLUS"];

export function isBillingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Formats cents into a display string, e.g. 1600 -> "$16". */
export function formatPrice(cents: number) {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
