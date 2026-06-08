import type { SkillFile } from "./types";

export const newBalanceSkill: SkillFile = {
  clientId: "new-balance",
  primaryMetric: "ordered_revenue",
  comparison: "YoY",
  drillOrder: ["brand", "category", "sku"],
  priors: {
    firstSuspect: "conversion",
    suspectNotes:
      "Premium-running placement on Amazon usually drives the conversion line. When the gap widens, look at organic SOV on branded top-2 keywords first, then placement-driven conversion, then mix shift to lower-ASP styles.",
  },
  thresholds: {
    gapToPlanPct: 10,
    availabilityPct: 95,
    contentScorePct: 80,
  },
  customContext: [
    "1080 and 990 are the franchise SKUs — protect those before chasing entry-tier units.",
    "Kids RAV is a halo SKU; treat its movement as a leading indicator for the kids line.",
    "Ad spend cuts (>15% PvP) typically show up two weeks later as a paid-SOV drop on branded top-2.",
  ],
  graduatedEdits: [],
};
