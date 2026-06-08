import { getDataset } from "@/lib/data";
import type { ClientDataset, SkuRow } from "@/lib/data/types";
import { alertNames } from "@/lib/rca/mapping";
import type { AlertName } from "@/lib/rca/mapping";
import type { SkillFile } from "@/lib/skills/types";

export type ComputedAlert = {
  id: string;
  alertKey: string;
  name: AlertName;
  metricId: string;
  summary: string;
  priority: number; // 0..100
  affectedSkus: string[];
  severity: "high" | "med" | "low";
  category?: string;
  brand?: string;
};

function pct(a: number, b: number) {
  return b === 0 ? 0 : (a - b) / b;
}

export function generateAlerts(clientId: string, skill: SkillFile): ComputedAlert[] {
  const ds = getDataset(clientId);
  const list: ComputedAlert[] = [];

  // 1. Gap to Plan
  const revNow = ds.skus.reduce((a, s) => a + s.revenue, 0);
  const planTotal = ds.skus.reduce((a, s) => a + s.planRevenue, 0);
  const gapPct = pct(revNow, planTotal);
  if (Math.abs(gapPct * 100) >= skill.thresholds.gapToPlanPct) {
    list.push({
      id: `${clientId}-gap`,
      alertKey: `${clientId}:gap-to-plan`,
      name: "Gap to Plan alert (weekly/daily threshold breach)",
      metricId: skill.primaryMetric,
      summary: `${skill.primaryMetric === "shipped_revenue" ? "Shipped" : "Ordered"} revenue tracking ${(gapPct * 100).toFixed(1)}% vs plan — breaches the ${skill.thresholds.gapToPlanPct}% threshold.`,
      priority: 95,
      severity: "high",
      affectedSkus: ds.skus.map((s) => s.sku),
    });
  }

  // 2. SKU attainment gap — top 5 by negative Δ
  const worst = [...ds.skus]
    .map((s) => ({ ...s, delta: s.revenue - s.priorRevenue }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3)
    .filter((s) => s.delta < 0);
  for (const s of worst) {
    list.push({
      id: `${clientId}-sku-${s.sku}`,
      alertKey: `${clientId}:sku-gap:${s.sku}`,
      name: "SKU attainment gap alert (top N SKUs)",
      metricId: "ordered_revenue",
      summary: `${s.sku} (${s.category}) revenue is ${(pct(s.revenue, s.priorRevenue) * 100).toFixed(0)}% vs prior — top contributor to the gap.`,
      priority: 88,
      severity: "high",
      affectedSkus: [s.sku],
      category: s.category,
      brand: s.brand,
    });
  }

  // 3. Availability% drop — per SKU below threshold
  const availBreaches = ds.skus.filter((s) => s.availability * 100 < skill.thresholds.availabilityPct);
  if (availBreaches.length) {
    const cats = Array.from(new Set(availBreaches.map((s) => s.category))).slice(0, 3);
    list.push({
      id: `${clientId}-avail`,
      alertKey: `${clientId}:availability`,
      name: "Availability% drop alert",
      metricId: "availability",
      summary: `Availability below ${skill.thresholds.availabilityPct}% on ${availBreaches.length} SKU(s) — concentrated in ${cats.join(", ")}.`,
      priority: clientId === "nestle" ? 92 : 70,
      severity: clientId === "nestle" ? "high" : "med",
      affectedSkus: availBreaches.map((s) => s.sku),
    });
  }

  // 4. PO fill rate alert
  const poBreaches = ds.skus.filter((s) => s.poFillRate < s.priorPoFillRate - 0.05);
  if (poBreaches.length) {
    list.push({
      id: `${clientId}-po`,
      alertKey: `${clientId}:po-fill`,
      name: "Inventory/PO shortfall alert",
      metricId: "po_fill_rate",
      summary: `PO fill rate dropped ${(avg(poBreaches.map((s) => s.poFillRate - s.priorPoFillRate)) * 100).toFixed(0)}pp across ${poBreaches.length} SKU(s) — upstream of availability.`,
      priority: clientId === "nestle" ? 90 : 65,
      severity: clientId === "nestle" ? "high" : "med",
      affectedSkus: poBreaches.map((s) => s.sku),
    });
  }

  // 5. Branded organic SOV drop
  const branded = ds.keywords.filter((k) => k.branded);
  if (branded.length) {
    const dPct = avg(branded.map((k) => pct(k.organicSov, k.priorOrganicSov)));
    if (dPct < -0.05) {
      list.push({
        id: `${clientId}-sov`,
        alertKey: `${clientId}:organic-sov`,
        name: "Organic SOV drop alert (keyword-level)",
        metricId: "organic_sov",
        summary: `Branded organic SOV down ${(dPct * 100).toFixed(0)}% across ${branded.length} tracked term(s).`,
        priority: 78,
        severity: "med",
        affectedSkus: [],
      });
    }
  }

  // 6. Ad spend anomaly
  const spendNow = ds.skus.reduce((a, s) => a + s.adSpend, 0);
  const spendPrior = ds.skus.reduce((a, s) => a + s.priorAdSpend, 0);
  const adDelta = pct(spendNow, spendPrior);
  if (Math.abs(adDelta) > 0.15) {
    list.push({
      id: `${clientId}-ad`,
      alertKey: `${clientId}:ad-anomaly`,
      name: "Ad Spend anomaly alert (iRoAS/RoAS deterioration)",
      metricId: "ad_spend",
      summary: `Ad spend ${(adDelta * 100).toFixed(0)}% PvP; attributed sales are down materially — RoAS slipping on franchise SKUs.`,
      priority: 72,
      severity: "med",
      affectedSkus: [],
    });
  }

  // 7. ASP change alert
  const aspNow = revNow / Math.max(ds.skus.reduce((a, s) => a + s.units, 0), 1);
  const aspPrior = ds.skus.reduce((a, s) => a + s.priorRevenue, 0) / Math.max(ds.skus.reduce((a, s) => a + s.priorUnits, 0), 1);
  if (pct(aspNow, aspPrior) < -0.05) {
    list.push({
      id: `${clientId}-asp`,
      alertKey: `${clientId}:asp-change`,
      name: "ASP change alert (own + category avg)",
      metricId: "asp",
      summary: `Average selling price moved ${(pct(aspNow, aspPrior) * 100).toFixed(1)}% — mix-shift toward lower-ASP styles.`,
      priority: 60,
      severity: "med",
      affectedSkus: [],
    });
  }

  // 8. LBB
  const lbbAvg = avg(ds.skus.map((s) => s.lostBuyBox));
  if (lbbAvg > 0.05) {
    list.push({
      id: `${clientId}-lbb`,
      alertKey: `${clientId}:lbb`,
      name: "Lost Buy Box% spike alert",
      metricId: "lost_buy_box",
      summary: `Lost Buy Box averaging ${(lbbAvg * 100).toFixed(1)}% across active SKUs.`,
      priority: 50,
      severity: "low",
      affectedSkus: ds.skus.filter((s) => s.lostBuyBox > 0.05).map((s) => s.sku),
    });
  }

  return list.sort((a, b) => b.priority - a.priority);
}

function avg(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Surface the full taxonomy + which are currently firing for builder view
export const taxonomy = alertNames;
