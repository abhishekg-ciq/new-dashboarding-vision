import type { SkillFile } from "@/lib/skills/types";
import { semanticRegistry } from "./registry";
import type { Comparison, SemanticIntent, SemanticMetric } from "./types";

const metricKeywords: { ids: string[]; words: string[] }[] = [
  { ids: ["ordered_revenue", "shipped_revenue"], words: ["sales", "revenue", "tracking", "plan", "topline", "top line"] },
  { ids: ["ordered_units"], words: ["units", "volume", "orders"] },
  { ids: ["asp"], words: ["asp", "price", "selling price"] },
  { ids: ["glance_views"], words: ["glance views", "gv", "traffic"] },
  { ids: ["organic_glance_views"], words: ["organic traffic", "organic gv"] },
  { ids: ["paid_glance_views"], words: ["paid traffic", "paid gv"] },
  { ids: ["unit_conversion"], words: ["conversion", "cvr", "convert"] },
  { ids: ["organic_sov"], words: ["organic sov", "organic share"] },
  { ids: ["paid_sov"], words: ["paid sov", "paid share"] },
  { ids: ["availability"], words: ["availability", "in stock", "oos", "stockout"] },
  { ids: ["po_fill_rate"], words: ["po fill", "purchase order", "fill rate"] },
  { ids: ["lost_buy_box"], words: ["buy box", "lbb"] },
  { ids: ["content_score"], words: ["content score", "content quality"] },
  { ids: ["promo_rate"], words: ["promo", "promotion", "discount"] },
  { ids: ["rating"], words: ["rating", "review"] },
  { ids: ["ad_spend"], words: ["ad spend", "media spend", "advertising"] },
  { ids: ["ad_sales"], words: ["ad sales", "ad attributed", "attributed sales"] },
  { ids: ["market_share"], words: ["market share", "share"] },
];

const dimKeywords: { id: string; words: string[] }[] = [
  { id: "brand", words: ["brand", "by brand"] },
  { id: "category", words: ["category", "by category", "categories"] },
  { id: "sku", words: ["sku", "by sku", "asin", "product"] },
  { id: "keyword", words: ["keyword", "by keyword", "search term"] },
];

const comparisonKeywords: { value: Comparison; words: string[] }[] = [
  { value: "vsPlan", words: ["vs plan", "to plan", "against plan", "tracking", "attainment"] },
  { value: "YoY", words: ["yoy", "year over year", "vs last year"] },
  { value: "PvP", words: ["pvp", "period over period", "vs last period", "vs last week"] },
];

const timeframeKeywords: { tf: string; words: string[] }[] = [
  { tf: "trailing-13w", words: ["13 week", "trailing 13", "last 13"] },
  { tf: "wtd", words: ["wtd", "week to date"] },
  { tf: "mtd", words: ["mtd", "month to date"] },
  { tf: "qtd", words: ["qtd", "quarter to date"] },
  { tf: "ytd", words: ["ytd", "year to date"] },
];

function pickMetric(nl: string, skill: SkillFile): SemanticMetric | undefined {
  const lower = nl.toLowerCase();
  for (const m of metricKeywords) {
    for (const w of m.words) {
      if (lower.includes(w)) {
        // resolve to the right revenue id per skill primary
        if (m.ids.length > 1 && m.ids[0].endsWith("revenue")) {
          return semanticRegistry.metrics.find((x) => x.id === skill.primaryMetric);
        }
        return semanticRegistry.metrics.find((x) => x.id === m.ids[0]);
      }
    }
  }
  // default → primary revenue metric
  return semanticRegistry.metrics.find((x) => x.id === skill.primaryMetric);
}

function pickDims(nl: string, metric: SemanticMetric, skill: SkillFile): string[] {
  const lower = nl.toLowerCase();
  const matched: string[] = [];
  for (const d of dimKeywords) {
    if (d.words.some((w) => lower.includes(w))) matched.push(d.id);
  }
  if (matched.length > 0) return matched;
  // For top-line questions ("how are sales tracking"), default to trend (no dim).
  if (/track|trend|how (are|is)/i.test(nl)) return [];
  // Otherwise, default to the first dim in the skill's drill order that's in the metric's defaultDims.
  const fallback = skill.drillOrder.find((d) => metric.defaultDims.includes(d));
  return fallback ? [fallback] : metric.defaultDims.slice(0, 1);
}

function pickComparison(nl: string, skill: SkillFile): Comparison {
  const lower = nl.toLowerCase();
  for (const c of comparisonKeywords) {
    if (c.words.some((w) => lower.includes(w))) return c.value;
  }
  return skill.comparison;
}

function pickTimeframe(nl: string): string {
  const lower = nl.toLowerCase();
  for (const t of timeframeKeywords) if (t.words.some((w) => lower.includes(w))) return t.tf;
  return "trailing-13w";
}

export function resolveIntent(nl: string, skill: SkillFile): SemanticIntent {
  const metric = pickMetric(nl, skill);
  if (!metric) throw new Error("Could not resolve a metric for: " + nl);
  return {
    metricId: metric.id,
    dimensionIds: pickDims(nl, metric, skill),
    filters: {},
    timeframe: pickTimeframe(nl),
    comparison: pickComparison(nl, skill),
  };
}

export function describeIntent(intent: SemanticIntent): string {
  const m = semanticRegistry.metrics.find((x) => x.id === intent.metricId);
  const dim = intent.dimensionIds.length ? ` by ${intent.dimensionIds.join(", ")}` : "";
  return `${m?.label || intent.metricId}${dim} • ${intent.timeframe} • ${intent.comparison}`;
}
