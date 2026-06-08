import type { SemanticIntent } from "@/lib/semantic/types";

export type PrebuiltWidget = {
  id: string;
  title: string;
  intent: SemanticIntent;
  size?: "sm" | "md" | "lg";
  anomalous?: boolean;
  vizType?: "line" | "bar" | "table" | "kpi";
};

export type PrebuiltDashboard = {
  id: string;
  name: string;
  description: string;
  clientId?: string; // if set, only for this client
  status: "deep" | "functional" | "stub";
  /** standard = available to all; custom = FDE-built, locked, non-editable */
  category?: "standard" | "custom";
  widgets: PrebuiltWidget[];
};

const nbGapToPlan: PrebuiltDashboard = {
  id: "gap-to-plan",
  name: "Gap to Plan",
  description: "Topline pacing, gap drivers, and the worst contributing SKUs.",
  status: "deep",
  widgets: [
    {
      id: "gtp-rev",
      title: "Ordered Revenue · trend vs plan",
      intent: { metricId: "ordered_revenue", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "vsPlan" },
      size: "lg",
      anomalous: true,
    },
    {
      id: "gtp-units",
      title: "Ordered Units · YoY",
      intent: { metricId: "ordered_units", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    },
    {
      id: "gtp-asp",
      title: "ASP by category",
      intent: { metricId: "asp", dimensionIds: ["category"], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    },
    {
      id: "gtp-sku",
      title: "Top SKU contributors (Ordered Revenue)",
      intent: { metricId: "ordered_revenue", dimensionIds: ["sku"], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
      size: "lg",
      anomalous: true,
    },
  ],
};

const nbBrandPulse: PrebuiltDashboard = {
  id: "brand-pulse",
  name: "Target / Brand Pulse",
  description: "How the brand is performing this week against the plan and against prior period.",
  status: "deep",
  widgets: [
    // Metric cards
    {
      id: "bp-rev-kpi",
      title: "Revenue",
      intent: { metricId: "ordered_revenue", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
      vizType: "kpi",
    },
    {
      id: "bp-conv-kpi",
      title: "Unit Conversion",
      intent: { metricId: "unit_conversion", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
      vizType: "kpi",
    },
    {
      id: "bp-avail-kpi",
      title: "Availability",
      intent: { metricId: "availability", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
      vizType: "kpi",
    },
    // Charts
    {
      id: "bp-rev-cat",
      title: "Revenue by Category",
      intent: { metricId: "ordered_revenue", dimensionIds: ["category"], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
      anomalous: true,
    },
    {
      id: "bp-conversion",
      title: "Unit Conversion · trend",
      intent: { metricId: "unit_conversion", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    },
    {
      id: "bp-sov",
      title: "Organic SOV by Brand",
      intent: { metricId: "organic_sov", dimensionIds: ["brand"], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    },
    {
      id: "bp-ad",
      title: "Ad Spend by Category",
      intent: { metricId: "ad_spend", dimensionIds: ["category"], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    },
    // Table
    {
      id: "bp-sku-table",
      title: "Revenue by SKU",
      intent: { metricId: "ordered_revenue", dimensionIds: ["sku"], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
      vizType: "table",
      size: "lg",
    },
  ],
};

// Nestlé-flavoured variants of the same two dashboards
const nestleGapToPlan: PrebuiltDashboard = {
  ...nbGapToPlan,
  widgets: nbGapToPlan.widgets.map((w) => ({
    ...w,
    intent: { ...w.intent, metricId: w.intent.metricId === "ordered_revenue" ? "shipped_revenue" : w.intent.metricId, comparison: "PvP" as const },
  })),
};

const nestleBrandPulse: PrebuiltDashboard = {
  ...nbBrandPulse,
  widgets: nbBrandPulse.widgets.map((w) => ({
    ...w,
    intent: { ...w.intent, metricId: w.intent.metricId === "ordered_revenue" ? "shipped_revenue" : w.intent.metricId, comparison: "PvP" as const },
  })),
};

const stubs: PrebuiltDashboard[] = [
  { id: "promo",        name: "Promo Effectiveness",      description: "ROI by promo type, days on promo, lift vs baseline.", status: "functional", widgets: [] },
  { id: "availability", name: "Availability & Execution", description: "Availability% trend, OOS revenue lost, PO fill rate.",  status: "stub",      widgets: [] },
  { id: "market-share", name: "Market Share & Competitive", description: "$ share trend, competitor moves.",                   status: "stub",      widgets: [] },
  { id: "sku",          name: "SKU Performance",          description: "Per-SKU revenue, units, ASP, conversion, content.",    status: "stub",      widgets: [] },
];

const customDashboards: PrebuiltDashboard[] = [
  {
    id: "custom-exec-scorecard",
    name: "Executive Scorecard",
    description: "Bespoke KPI summary built for QBR reporting — custom metric blends and branded layout.",
    status: "deep",
    category: "custom",
    widgets: [],
  },
  {
    id: "custom-digital-shelf",
    name: "Digital Shelf Tracker",
    description: "Real-time content & availability heatmap with client-specific threshold rules.",
    status: "deep",
    category: "custom",
    widgets: [],
  },
];

export const prebuiltDashboards: Record<string, PrebuiltDashboard[]> = {
  "new-balance": [nbBrandPulse, nbGapToPlan, ...stubs, ...customDashboards],
  "nestle":      [nestleBrandPulse, nestleGapToPlan, ...stubs, ...customDashboards],
};

export function getPrebuilt(clientId: string, id: string): PrebuiltDashboard | undefined {
  return prebuiltDashboards[clientId]?.find((d) => d.id === id);
}
