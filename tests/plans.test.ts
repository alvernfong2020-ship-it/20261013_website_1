import { describe, expect, it } from "vitest";
import { PLAN_DEFINITIONS, PLAN_ORDER, entitlementsFor, planFor, formatPrice } from "@/lib/plans";

describe("plan configuration", () => {
  it("defines every plan in the order list", () => {
    for (const id of PLAN_ORDER) {
      expect(PLAN_DEFINITIONS[id], id).toBeTruthy();
      expect(PLAN_DEFINITIONS[id].id).toBe(id);
    }
  });

  it("entitlements increase monotonically up the tiers for key limits", () => {
    const credits = PLAN_ORDER.map((id) => PLAN_DEFINITIONS[id].entitlements.aiCredits);
    const published = PLAN_ORDER.map((id) => PLAN_DEFINITIONS[id].entitlements.publishedStories);
    for (let i = 1; i < credits.length; i++) {
      expect(credits[i]).toBeGreaterThanOrEqual(credits[i - 1]);
      expect(published[i]).toBeGreaterThanOrEqual(published[i - 1]);
    }
  });

  it("only paid plans remove the watermark", () => {
    expect(PLAN_DEFINITIONS.FREE.entitlements.removeWatermark).toBe(false);
    expect(PLAN_DEFINITIONS.PRO.entitlements.removeWatermark).toBe(true);
  });

  it("planFor falls back to FREE for unknown values", () => {
    expect(planFor("NOPE").id).toBe("FREE");
    expect(planFor(null).id).toBe("FREE");
    expect(entitlementsFor("PRO_PLUS").customDomains).toBeGreaterThan(0);
  });

  it("formatPrice renders whole and fractional cents", () => {
    expect(formatPrice(0)).toBe("$0");
    expect(formatPrice(1600)).toBe("$16");
    expect(formatPrice(1650)).toBe("$16.50");
  });
});
