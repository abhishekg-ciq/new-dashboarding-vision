import type { Comparison } from "@/lib/semantic/types";

export type SkillFile = {
  clientId: string;
  primaryMetric: string;
  comparison: Comparison;
  drillOrder: string[];
  priors: {
    firstSuspect: "traffic" | "conversion" | "asp" | "catalog";
    suspectNotes: string;
  };
  thresholds: {
    gapToPlanPct: number;
    availabilityPct: number;
    contentScorePct: number;
  };
  customContext: string[];
  graduatedEdits?: { ts: number; note: string }[];
};
