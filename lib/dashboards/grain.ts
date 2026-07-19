import { getMetric } from "@/lib/semantic/registry";
import type { SemanticIntent } from "@/lib/semantic/types";

/**
 * A dashboard's grain is the single entity-level its widgets are sourced at — e.g. a
 * SKU-level fact table vs. a keyword-level SOV table. Two widgets can share a dashboard
 * (and its global filter set) only if they're the same grain; a "Revenue trend", "Revenue
 * by Brand", and "Revenue by Category" widget are all still SKU-grain, just displayed at
 * different roll-ups of the same underlying rows (INV-7).
 */

// Coarse → fine, within the dims a metric can be sourced from. Ties break toward the
// higher-ranked (finer) dim — e.g. a metric available at both category and brand is
// brand-grain, since brand is the more granular entity.
const GRAIN_RANK: Record<string, number> = {
  channel: 0,
  category: 0,
  brand: 1,
  campaign: 2,
  keyword: 2,
  sku: 3,
};

/** The fields actually present on that grain's underlying row (lib/data/types.ts SkuRow / KeywordRow). */
const SOURCE_FIELDS: Record<string, string[]> = {
  sku: ["brand", "category", "sub_category", "sub_brand", "sku"],
  keyword: ["brand", "keyword"],
  campaign: ["brand", "category", "campaign"],
  category: ["category"],
  brand: ["brand"],
  channel: ["channel"],
};

export function metricGrain(metricId: string): string | undefined {
  const dims = getMetric(metricId)?.defaultDims ?? [];
  if (dims.length === 0) return undefined;
  return dims.reduce((best, d) => ((GRAIN_RANK[d] ?? -1) > (GRAIN_RANK[best] ?? -1) ? d : best), dims[0]);
}

/** The dashboard's grain, established by its first widget. Null for an empty canvas. */
export function computeGrain(intents: SemanticIntent[]): string | null {
  if (intents.length === 0) return null;
  return metricGrain(intents[0].metricId) ?? null;
}

/** Whether `intent` is the same grain as the dashboard's established grain (INV-7). */
export function isGrainCompatible(grain: string | null, intent: SemanticIntent): boolean {
  if (grain === null) return true;
  const g = metricGrain(intent.metricId);
  return g !== undefined && g === grain;
}

/** Sensible global-filter-set default for a grain — the product/search hierarchy above it. */
export function defaultGlobalDims(grain: string | null): string[] {
  if (!grain) return [];
  if (grain === "sku") return ["brand", "category"];
  if (grain === "keyword") return ["brand"];
  if (grain === "campaign") return ["brand", "category"];
  if (grain === "brand") return ["brand"];
  return [grain];
}

/** Dims a global-filter-set selection can validly carry at this grain (its source's real fields). */
export function supportedGlobalDims(grain: string | null): string[] {
  if (!grain) return [];
  return SOURCE_FIELDS[grain] ?? [grain];
}
