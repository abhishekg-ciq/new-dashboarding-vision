import { mapMetric } from "@/lib/rca/mapping";
import type { Dimension, SemanticMetric, SemanticRegistry } from "./types";

type MetricSeed = Omit<SemanticMetric, "rcaNodes" | "alerts"> & {
  backendName: string;
  definition: string;
};

const seeds: MetricSeed[] = [
  {
    id: "ordered_revenue",
    label: "Ordered Revenue",
    format: "currency",
    identityRole: "composite",
    defaultDims: ["brand", "category", "sku"],
    backendName: "ordered_revenue",
    definition:
      "Ordered revenue in USD, aggregated from order events. Used as the primary revenue metric for Amazon Vendor Central accounts; compared against plan/forecast.",
  },
  {
    id: "shipped_revenue",
    label: "Shipped Revenue",
    format: "currency",
    identityRole: "composite",
    defaultDims: ["category", "brand", "sku"],
    backendName: "shipped_revenue",
    definition:
      "Net shipped revenue (1P). The CPG primary metric; closer to fulfilled demand and sensitive to availability/PO-fill.",
  },
  {
    id: "ordered_units",
    label: "Ordered Units",
    format: "number",
    identityRole: "traffic",
    defaultDims: ["brand", "category", "sku"],
    backendName: "ordered_units",
    definition: "Number of units ordered. Used to isolate volume from price.",
  },
  {
    id: "asp",
    label: "Average Selling Price",
    format: "currency",
    identityRole: "asp",
    defaultDims: ["brand", "category", "sku"],
    backendName: "asp",
    definition:
      "Average selling price = revenue / units. Mix shifts to lower-ASP SKUs depress this without any per-SKU price change.",
  },
  {
    id: "glance_views",
    label: "Glance Views",
    format: "number",
    identityRole: "traffic",
    defaultDims: ["brand", "category", "sku"],
    backendName: "glance_views",
    definition: "Total detail-page views (organic + paid).",
  },
  {
    id: "organic_glance_views",
    label: "Organic Glance Views",
    format: "number",
    identityRole: "traffic",
    defaultDims: ["brand", "category", "keyword"],
    backendName: "organic_glance_views",
    definition: "Detail-page views attributed to organic discovery.",
  },
  {
    id: "paid_glance_views",
    label: "Paid Glance Views",
    format: "number",
    identityRole: "traffic",
    defaultDims: ["brand", "category", "keyword"],
    backendName: "paid_glance_views",
    definition: "Detail-page views attributed to paid (SP/SB/SD) clicks.",
  },
  {
    id: "unit_conversion",
    label: "Unit Conversion",
    format: "percent",
    identityRole: "conversion",
    defaultDims: ["brand", "category", "sku"],
    backendName: "unit_conversion",
    definition: "Ordered units / glance views. A primary L1 lever.",
  },
  {
    id: "organic_sov",
    label: "Organic SOV",
    format: "percent",
    defaultDims: ["brand", "keyword"],
    backendName: "organic_sov",
    definition: "Share of organic search results on tracked keywords.",
  },
  {
    id: "paid_sov",
    label: "Paid SOV",
    format: "percent",
    defaultDims: ["brand", "keyword"],
    backendName: "paid_sov",
    definition: "Share of sponsored placements on tracked keywords.",
  },
  {
    id: "ad_spend",
    label: "Ad Spend",
    format: "currency",
    defaultDims: ["brand", "category", "campaign"],
    backendName: "ad_spend",
    definition: "Total advertising investment across SP, SB, SD, SBV.",
  },
  {
    id: "ad_sales",
    label: "Ad-Attributed Sales",
    format: "currency",
    defaultDims: ["brand", "category", "campaign"],
    backendName: "ad_sales",
    definition: "Sales attributed to advertising clicks within attribution window.",
  },
  {
    id: "availability",
    label: "Availability %",
    format: "percent",
    identityRole: "conversion",
    defaultDims: ["category", "brand", "sku"],
    backendName: "availability",
    definition:
      "% of time a SKU was in-stock and buyable. The dominant conversion lever for CPG/availability-constrained categories.",
  },
  {
    id: "po_fill_rate",
    label: "PO Fill Rate",
    format: "percent",
    defaultDims: ["category", "brand", "sku"],
    backendName: "po_fill_rate",
    definition:
      "% of vendor PO units accepted/shipped. Low fill upstream → low availability downstream.",
  },
  {
    id: "lost_buy_box",
    label: "Lost Buy Box %",
    format: "percent",
    identityRole: "conversion",
    defaultDims: ["brand", "category", "sku"],
    backendName: "lost_buy_box",
    definition: "% of time a SKU lost the featured offer to 3P.",
  },
  {
    id: "content_score",
    label: "Content Score",
    format: "percent",
    defaultDims: ["brand", "category", "sku"],
    backendName: "content_score",
    definition: "Composite score of title / image / bullets / A+ / PIM compliance.",
  },
  {
    id: "promo_rate",
    label: "Promo Rate",
    format: "percent",
    defaultDims: ["brand", "category"],
    backendName: "promo_rate",
    definition: "Days a SKU was on promotion vs total days.",
  },
  {
    id: "rating",
    label: "Avg Rating",
    format: "number",
    defaultDims: ["brand", "category", "sku"],
    backendName: "rating",
    definition: "Average customer rating across reviews.",
  },
  {
    id: "market_share",
    label: "Market Share",
    format: "percent",
    defaultDims: ["category", "brand"],
    backendName: "market_share",
    definition: "Our $ share of category sales.",
  },
  {
    id: "category_size",
    label: "Category Size",
    format: "currency",
    defaultDims: ["category"],
    backendName: "category_size",
    definition: "Total $ sales in the category.",
  },
];

function build(seeds: MetricSeed[]): SemanticMetric[] {
  return seeds.map((s) => {
    const m = mapMetric(s.backendName, s.label, s.definition);
    return {
      ...s,
      rcaNodes: m.rcaUseCases,
      alerts: m.alerts,
    } as SemanticMetric;
  });
}

const dimensions: Dimension[] = [
  { id: "brand", label: "Brand", values: [] },
  { id: "category", label: "Category", values: [] },
  { id: "sku", label: "SKU", values: [] },
  { id: "keyword", label: "Keyword", values: [] },
  { id: "channel", label: "Channel", values: ["Organic", "Paid"] },
  { id: "campaign", label: "Campaign", values: [] },
];

export const semanticRegistry: SemanticRegistry = {
  metrics: build(seeds),
  dimensions,
};

export function getMetric(id: string): SemanticMetric | undefined {
  return semanticRegistry.metrics.find((m) => m.id === id);
}

export function getDimension(id: string): Dimension | undefined {
  return semanticRegistry.dimensions.find((d) => d.id === id);
}
