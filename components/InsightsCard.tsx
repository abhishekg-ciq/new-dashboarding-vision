"use client";
import { useEffect, useMemo, useState } from "react";
import { compute, format } from "@/lib/semantic/compute";
import { getMetric } from "@/lib/semantic/registry";
import type { SemanticIntent } from "@/lib/semantic/types";
import type { SkillFile } from "@/lib/skills/types";

type Item = { title: string; intent: SemanticIntent };

/**
 * Forward-looking insights generated from the dashboard's widget intents.
 * Per PRD §A "I want insights & forward-looking recommendations tailored to my business".
 *
 * Heuristics: scan widgets, find the largest negative delta, surface a recommended action
 * based on the metric's identity role + the client skill's first-suspect prior.
 */
export default function InsightsCard({
  dashboardName,
  widgets,
  clientId,
  skill,
}: {
  dashboardName: string;
  widgets: Item[];
  clientId: string;
  skill: SkillFile;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const insights = useMemo(() => generate(widgets, clientId, skill), [widgets, clientId, skill]);

  if (!mounted || insights.length === 0) return null;

  return (
    <div className="card p-4 space-y-2 border-[var(--violet-200)] bg-gradient-to-br from-[var(--violet-50)] to-white">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-[var(--ciq-purple)]">Executive Summary</div>
      </div>
      <ul className="space-y-1.5">
        {insights.map((i, idx) => (
          <li key={idx} className="flex gap-2 text-[13px]">
            <span className="text-[var(--violet-700)] font-bold">{idx + 1}.</span>
            <div>
              <span className="font-medium text-[var(--ciq-purple)]">{i.headline}</span>
              <span className="text-[var(--fg-muted)]"> — {i.recommendation}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Insight = { headline: string; recommendation: string };

function generate(widgets: Item[], clientId: string, skill: SkillFile): Insight[] {
  const out: Insight[] = [];
  // Top metric impact insight — biggest negative delta among the widgets
  const ranked = widgets
    .map((w) => {
      const r = compute(w.intent, clientId);
      const m = getMetric(w.intent.metricId);
      return { title: w.title, metric: m, result: r, intent: w.intent };
    })
    .filter((x) => x.metric)
    .sort((a, b) => a.result.comparisonDelta.pct - b.result.comparisonDelta.pct);

  const worst = ranked[0];
  if (worst && worst.result.comparisonDelta.pct < -0.02) {
    const pct = Math.abs(worst.result.comparisonDelta.pct * 100).toFixed(1);
    const role = worst.metric?.identityRole;
    out.push({
      headline: `${worst.metric!.label} is ${pct}% below ${worst.intent.comparison === "vsPlan" ? "plan" : "prior"}`,
      recommendation:
        role === "traffic"
          ? `Check ${skill.priors.firstSuspect === "traffic" ? "SOV + paid coverage on the top 10 keywords" : "organic SOV drift and paid spend rotation"}.`
          : role === "conversion"
            ? "Audit content score, availability %, and lost buy box for the top 20 SKUs."
            : role === "asp"
              ? "Investigate mix shift to lower-ASP SKUs and recent promo depth changes."
              : `Decompose into traffic × conversion × ASP and follow the largest contributor.`,
    });
  }

  // Promo opportunity if any widget hits promo_rate
  const promo = ranked.find((r) => r.intent.metricId === "promo_rate");
  if (promo && promo.result.total < 0.4) {
    out.push({
      headline: `Promo coverage is low (${(promo.result.total * 100).toFixed(1)}%)`,
      recommendation: "Identify the top 10 SKUs with 0 promo activity in the last 4 weeks — likely lift candidates.",
    });
  }

  // Distribution / availability angle
  const avail = ranked.find((r) => r.intent.metricId === "availability");
  if (avail && avail.result.total < skill.thresholds.availabilityPct / 100) {
    out.push({
      headline: `Availability below threshold (${(avail.result.total * 100).toFixed(1)}%)`,
      recommendation:
        "Pull top-50 OOS SKUs from the last 7 days; estimate lost revenue and feed the demand-planning sync.",
    });
  }

  // Generic fallback to ensure there are at least 2-3 items
  if (out.length < 2) {
    out.push({
      headline: `Build an at-risk SKU list for ${skill.primaryMetric === "shipped_revenue" ? "Shipped Revenue" : "Ordered Revenue"}`,
      recommendation: "Rank top 20 contributors to the gap and prioritize the 5 with the largest negative delta.",
    });
  }
  if (out.length < 3) {
    out.push({
      headline: `Distribution expansion targets`,
      recommendation:
        "Cross-reference high-velocity SKUs missing in 2+ retailers — surface as expansion opportunities for the next plan cycle.",
    });
  }
  return out.slice(0, 3);
}
