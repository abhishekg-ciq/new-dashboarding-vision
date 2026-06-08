import type { ClientDataset, SkuRow, KeywordRow, TrendPoint } from "./types";

/**
 * New Balance — engineered to reproduce §5/§11 demo facts:
 *   Sales ≈ −15% YoY, units ≈ −8%, ASP ≈ −8% (mix-shift driven)
 *   Glance Views +11%, Unit Conversion 3.5% → 2.9%
 *   Branded top-2 keyword SOV ≈ −12%
 *   1080 is the worst revenue contributor (ASP −20%)
 *   520 units roughly double (+100%)
 *   Ad spend −19%, ad-attributed sales −30%
 *
 * Numbers below are deterministic — the engine computes over them; no LLM math.
 */

const skus: SkuRow[] = [
  // 1080 — premium running, hardest hit. ASP −20%, units cut.
  // GV down with the franchise (paid SOV loss feeds back as discovery drop).
  {
    sku: "1080v13",
    brand: "New Balance",
    category: "Running Premium",
    revenue: 1_600_000, units: 10_000, glanceViews: 400_000,
    priorRevenue: 2_800_000, priorUnits: 14_000, priorGlanceViews: 449_000,
    planRevenue: 3_000_000,
    availability: 0.97, priorAvailability: 0.96,
    poFillRate: 0.94, priorPoFillRate: 0.94,
    lostBuyBox: 0.04, contentScore: 0.88, promoRate: 0.32,
    adSpend: 145_000, priorAdSpend: 220_000,
    adSales: 280_000, priorAdSales: 460_000,
    organicSov: 0.55, priorOrganicSov: 0.62,
    paidSov: 0.38, priorPaidSov: 0.47,
  },
  // 990 — premium classic
  {
    sku: "990v6",
    brand: "New Balance",
    category: "Running Premium",
    revenue: 1_312_500, units: 7_500, glanceViews: 230_000,
    priorRevenue: 1_440_000, priorUnits: 8_000, priorGlanceViews: 256_000,
    planRevenue: 1_550_000,
    availability: 0.95, priorAvailability: 0.95,
    poFillRate: 0.93, priorPoFillRate: 0.93,
    lostBuyBox: 0.05, contentScore: 0.84, promoRate: 0.21,
    adSpend: 110_000, priorAdSpend: 140_000,
    adSales: 240_000, priorAdSales: 360_000,
    organicSov: 0.52, priorOrganicSov: 0.60,
    paidSov: 0.34, priorPaidSov: 0.41,
  },
  // 880 — mid running
  {
    sku: "880v14",
    brand: "New Balance",
    category: "Running",
    revenue: 1_330_000, units: 9_500, glanceViews: 360_000,
    priorRevenue: 1_540_000, priorUnits: 11_000, priorGlanceViews: 353_000,
    planRevenue: 1_650_000,
    availability: 0.93, priorAvailability: 0.94,
    poFillRate: 0.90, priorPoFillRate: 0.91,
    lostBuyBox: 0.07, contentScore: 0.82, promoRate: 0.18,
    adSpend: 70_000, priorAdSpend: 85_000,
    adSales: 175_000, priorAdSales: 230_000,
    organicSov: 0.34, priorOrganicSov: 0.36,
    paidSov: 0.26, priorPaidSov: 0.27,
  },
  // 680 — trail (slight tailwind)
  {
    sku: "680v8",
    brand: "New Balance",
    category: "Trail",
    revenue: 915_000, units: 7_500, glanceViews: 260_000,
    priorRevenue: 840_000, priorUnits: 7_000, priorGlanceViews: 232_000,
    planRevenue: 900_000,
    availability: 0.96, priorAvailability: 0.95,
    poFillRate: 0.94, priorPoFillRate: 0.94,
    lostBuyBox: 0.04, contentScore: 0.86, promoRate: 0.16,
    adSpend: 42_000, priorAdSpend: 60_000,
    adSales: 130_000, priorAdSales: 170_000,
    organicSov: 0.31, priorOrganicSov: 0.30,
    paidSov: 0.22, priorPaidSov: 0.23,
  },
  // Kids RAV — halo
  {
    sku: "Kids RAV",
    brand: "New Balance",
    category: "Kids",
    revenue: 907_500, units: 16_500, glanceViews: 500_000,
    priorRevenue: 880_000, priorUnits: 16_000, priorGlanceViews: 474_000,
    planRevenue: 950_000,
    availability: 0.98, priorAvailability: 0.97,
    poFillRate: 0.96, priorPoFillRate: 0.95,
    lostBuyBox: 0.02, contentScore: 0.90, promoRate: 0.24,
    adSpend: 55_000, priorAdSpend: 65_000,
    adSales: 220_000, priorAdSales: 250_000,
    organicSov: 0.41, priorOrganicSov: 0.40,
    paidSov: 0.30, priorPaidSov: 0.29,
  },
  // 520 — lifestyle entry SURGE (units +100%, GV roughly doubles too)
  {
    sku: "520v8",
    brand: "New Balance",
    category: "Lifestyle Entry",
    revenue: 1_752_000, units: 24_000, glanceViews: 800_000,
    priorRevenue: 900_000, priorUnits: 12_000, priorGlanceViews: 314_000,
    planRevenue: 950_000,
    availability: 0.94, priorAvailability: 0.95,
    poFillRate: 0.92, priorPoFillRate: 0.93,
    lostBuyBox: 0.06, contentScore: 0.78, promoRate: 0.42,
    adSpend: 90_000, priorAdSpend: 75_000,
    adSales: 230_000, priorAdSales: 200_000,
    organicSov: 0.18, priorOrganicSov: 0.12,
    paidSov: 0.20, priorPaidSov: 0.14,
  },
  // 410 — lifestyle entry, slumped
  {
    sku: "410v7",
    brand: "New Balance",
    category: "Lifestyle Entry",
    revenue: 340_000, units: 5_000, glanceViews: 230_000,
    priorRevenue: 980_000, priorUnits: 14_000, priorGlanceViews: 343_000,
    planRevenue: 1_050_000,
    availability: 0.91, priorAvailability: 0.93,
    poFillRate: 0.88, priorPoFillRate: 0.90,
    lostBuyBox: 0.09, contentScore: 0.72, promoRate: 0.20,
    adSpend: 32_000, priorAdSpend: 55_000,
    adSales: 78_000, priorAdSales: 170_000,
    organicSov: 0.14, priorOrganicSov: 0.18,
    paidSov: 0.12, priorPaidSov: 0.15,
  },
  // 237 — lifestyle
  {
    sku: "237",
    brand: "New Balance",
    category: "Lifestyle",
    revenue: 836_000, units: 9_500, glanceViews: 320_000,
    priorRevenue: 1_350_000, priorUnits: 15_000, priorGlanceViews: 354_000,
    planRevenue: 1_400_000,
    availability: 0.95, priorAvailability: 0.96,
    poFillRate: 0.93, priorPoFillRate: 0.94,
    lostBuyBox: 0.05, contentScore: 0.81, promoRate: 0.22,
    adSpend: 50_000, priorAdSpend: 80_000,
    adSales: 130_000, priorAdSales: 230_000,
    organicSov: 0.22, priorOrganicSov: 0.26,
    paidSov: 0.18, priorPaidSov: 0.22,
  },
];

const keywords: KeywordRow[] = [
  { keyword: "new balance 1080", brand: "New Balance", organicSov: 0.55, priorOrganicSov: 0.62, paidSov: 0.38, priorPaidSov: 0.47, branded: true },
  { keyword: "new balance 990", brand: "New Balance", organicSov: 0.52, priorOrganicSov: 0.60, paidSov: 0.34, priorPaidSov: 0.41, branded: true },
  { keyword: "new balance running shoes", brand: "New Balance", organicSov: 0.34, priorOrganicSov: 0.37, paidSov: 0.30, priorPaidSov: 0.34, branded: true },
  { keyword: "running shoes men", brand: "New Balance", organicSov: 0.11, priorOrganicSov: 0.13, paidSov: 0.08, priorPaidSov: 0.10, branded: false },
  { keyword: "premium running shoes", brand: "New Balance", organicSov: 0.13, priorOrganicSov: 0.17, paidSov: 0.09, priorPaidSov: 0.13, branded: false },
  { keyword: "trail running shoes", brand: "New Balance", organicSov: 0.18, priorOrganicSov: 0.16, paidSov: 0.14, priorPaidSov: 0.13, branded: false },
  { keyword: "lifestyle sneakers", brand: "New Balance", organicSov: 0.19, priorOrganicSov: 0.12, paidSov: 0.16, priorPaidSov: 0.10, branded: false },
];

// 13-week trend, monotonically aligning with totals above.
const trend: TrendPoint[] = (() => {
  const totalNow = skus.reduce((a, s) => a + s.revenue, 0);
  const totalPrior = skus.reduce((a, s) => a + s.priorRevenue, 0);
  const totalPlan = skus.reduce((a, s) => a + s.planRevenue, 0);
  const totalUnits = skus.reduce((a, s) => a + s.units, 0);
  const totalGv = skus.reduce((a, s) => a + s.glanceViews, 0);
  // Weight curve — late-period dip aligns with the gap-to-plan narrative.
  const weights = [1.05, 1.02, 1.00, 0.99, 0.97, 0.96, 0.94, 0.92, 0.90, 0.85, 0.78, 0.72, 0.68];
  const norm = weights.reduce((a, b) => a + b, 0);
  return weights.map((w, i) => {
    const f = w / norm;
    const revenue = Math.round(totalNow * f);
    const plan = Math.round((totalPlan / 13));
    const units = Math.round(totalUnits * f);
    const glanceViews = Math.round(totalGv * f);
    return {
      week: `W${i + 1}`,
      revenue,
      plan,
      units,
      glanceViews,
      conversion: units / glanceViews,
    };
  });
})();

const marketShare = [
  { period: "Q-1", us: 0.21, competitor: 0.18 },
  { period: "Q0",  us: 0.19, competitor: 0.21 },
];

export const newBalanceDataset: ClientDataset = {
  clientId: "new-balance",
  clientLabel: "New Balance",
  skus,
  keywords,
  trend,
  marketShare,
};
