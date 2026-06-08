import type { SkillFile } from "./types";

export const nestleSkill: SkillFile = {
  clientId: "nestle",
  primaryMetric: "shipped_revenue",
  comparison: "PvP",
  drillOrder: ["category", "brand", "sku"],
  priors: {
    firstSuspect: "conversion",
    suspectNotes:
      "For CPG, availability and PO-fill are almost always the first culprit when shipped revenue dips. Check Availability% by category, then PO fill rate, then LBB. Pricing and placement come later.",
  },
  thresholds: {
    gapToPlanPct: 8,
    availabilityPct: 92,
    contentScorePct: 75,
  },
  customContext: [
    "Coffee and Nutrition are the lighthouse categories — they explain most movement.",
    "PO fill rate below 85% almost always shows up as Availability% drop the following week.",
    "Demand spikes are normal in late Q4; weight PvP comparisons against the 4-week seasonal trend.",
  ],
  graduatedEdits: [],
};
