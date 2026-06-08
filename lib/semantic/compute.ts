import { getDataset } from "@/lib/data";
import type { SkuRow, ClientDataset } from "@/lib/data/types";
import { getMetric } from "./registry";
import type { ChartSpec, ComputeResult, SemanticIntent } from "./types";

type FieldPair = { now: keyof SkuRow; prior: keyof SkuRow };

// metricId → (field on SkuRow now, prior). Aggregations below.
const sumFields: Record<string, FieldPair> = {
  ordered_revenue:    { now: "revenue",        prior: "priorRevenue" },
  shipped_revenue:    { now: "revenue",        prior: "priorRevenue" },
  ordered_units:      { now: "units",          prior: "priorUnits" },
  glance_views:       { now: "glanceViews",    prior: "priorGlanceViews" },
  organic_glance_views: { now: "glanceViews",  prior: "priorGlanceViews" },
  paid_glance_views:  { now: "glanceViews",    prior: "priorGlanceViews" },
  ad_spend:           { now: "adSpend",        prior: "priorAdSpend" },
  ad_sales:           { now: "adSales",        prior: "priorAdSales" },
};

// Weighted-average metrics: numerator/denominator on SkuRow.
// When `den` is null the aggregation is a simple per-SKU average of `num`.
type WeightedField = {
  num: keyof SkuRow;
  den: keyof SkuRow | null;
  priorNum: keyof SkuRow;
  priorDen: keyof SkuRow | null;
};

const weightedFields: Record<string, WeightedField> = {
  asp:           { num: "revenue", den: "units", priorNum: "priorRevenue", priorDen: "priorUnits" },
  unit_conversion: { num: "units", den: "glanceViews", priorNum: "priorUnits", priorDen: "priorGlanceViews" },
  availability:  { num: "availability", den: null, priorNum: "priorAvailability", priorDen: null },
  po_fill_rate:  { num: "poFillRate", den: null, priorNum: "priorPoFillRate", priorDen: null },
  lost_buy_box:  { num: "lostBuyBox", den: null, priorNum: "lostBuyBox", priorDen: null },
  content_score: { num: "contentScore", den: null, priorNum: "contentScore", priorDen: null },
  promo_rate:    { num: "promoRate", den: null, priorNum: "promoRate", priorDen: null },
  organic_sov:   { num: "organicSov", den: null, priorNum: "priorOrganicSov", priorDen: null },
  paid_sov:      { num: "paidSov", den: null, priorNum: "priorPaidSov", priorDen: null },
  rating:        { num: "contentScore", den: null, priorNum: "contentScore", priorDen: null }, // proxy
};

function num(row: SkuRow, key: keyof SkuRow): number {
  const v = row[key];
  return typeof v === "number" ? v : 0;
}

export function applyFilters(skus: SkuRow[], filters: Record<string, string>): SkuRow[] {
  return skus.filter((r) => {
    for (const [k, v] of Object.entries(filters)) {
      if (!v || v === "All") continue;
      if (k === "brand" && r.brand !== v) return false;
      if (k === "category" && r.category !== v) return false;
      if (k === "sku" && r.sku !== v) return false;
    }
    return true;
  });
}

function aggregate(
  filtered: SkuRow[],
  metricId: string,
): { total: number; prior: number } {
  if (sumFields[metricId]) {
    const f = sumFields[metricId];
    const total = filtered.reduce((a, r) => a + num(r, f.now), 0);
    const prior = filtered.reduce((a, r) => a + num(r, f.prior), 0);
    return { total, prior };
  }
  if (weightedFields[metricId]) {
    const f = weightedFields[metricId];
    if (f.den === null || f.priorDen === null) {
      const total = filtered.reduce((a, r) => a + num(r, f.num), 0) / Math.max(filtered.length, 1);
      const prior = filtered.reduce((a, r) => a + num(r, f.priorNum), 0) / Math.max(filtered.length, 1);
      return { total, prior };
    }
    const tn = filtered.reduce((a, r) => a + num(r, f.num), 0);
    const td = filtered.reduce((a, r) => a + num(r, f.den as keyof SkuRow), 0);
    const pn = filtered.reduce((a, r) => a + num(r, f.priorNum), 0);
    const pd = filtered.reduce((a, r) => a + num(r, f.priorDen as keyof SkuRow), 0);
    return { total: td > 0 ? tn / td : 0, prior: pd > 0 ? pn / pd : 0 };
  }
  return { total: 0, prior: 0 };
}

function rowsByDim(
  filtered: SkuRow[],
  dimensionId: string,
  metricId: string,
): { key: string; now: number; prior: number; delta: number }[] {
  const groups = new Map<string, SkuRow[]>();
  for (const r of filtered) {
    const key =
      dimensionId === "brand"
        ? r.brand
        : dimensionId === "category"
        ? r.category
        : r.sku;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const { total, prior } = aggregate(rows, metricId);
      return { key, now: total, prior, delta: total - prior };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function chartFor(intent: SemanticIntent, dataset: ClientDataset): ChartSpec {
  const m = getMetric(intent.metricId);
  if (!m) return { type: "kpi" };
  if (intent.dimensionIds.length === 0) return { type: "line", x: "week", y: "revenue", ref: 0 };
  if (intent.dimensionIds[0] === "brand" || intent.dimensionIds[0] === "category" || intent.dimensionIds[0] === "sku") {
    return { type: "bar", x: "key", y: "now" };
  }
  return { type: "table" };
}

export function compute(intent: SemanticIntent, clientId: string): ComputeResult {
  const dataset = getDataset(clientId);
  const filtered = applyFilters(dataset.skus, intent.filters);
  const { total, prior } = aggregate(filtered, intent.metricId);

  // Build rows
  let rows: Record<string, string | number>[] = [];
  if (intent.dimensionIds.length === 0) {
    // trend
    rows = dataset.trend.map((p) => ({
      week: p.week,
      revenue: p.revenue,
      plan: p.plan,
      units: p.units,
      glanceViews: p.glanceViews,
      conversion: Number((p.conversion * 100).toFixed(2)),
    }));
  } else {
    const dim = intent.dimensionIds[0];
    rows = rowsByDim(filtered, dim, intent.metricId).map((r) => ({
      key: r.key,
      now: r.now,
      prior: r.prior,
      delta: r.delta,
      pct: r.prior !== 0 ? Number(((r.delta / r.prior) * 100).toFixed(2)) : 0,
    }));
  }

  const comparisonDelta = {
    absolute: total - prior,
    pct: prior !== 0 ? (total - prior) / prior : 0,
  };

  return {
    rows,
    total,
    prior,
    comparisonDelta,
    chartSpec: chartFor(intent, dataset),
    notes: [],
  };
}

export function format(value: number, fmt: "currency" | "number" | "percent"): string {
  if (!isFinite(value)) return "—";
  if (fmt === "currency") {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${value < 0 ? "-" : ""}$${(abs / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (fmt === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatDelta(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(1)}%`;
}
