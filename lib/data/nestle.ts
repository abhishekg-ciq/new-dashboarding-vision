import type { ClientDataset, SkuRow, KeywordRow, TrendPoint } from "./types";

/**
 * Nestlé — engineered as the CPG/availability counter-example to NB.
 *   Shipped revenue ≈ −12% PvP
 *   Glance Views roughly flat (+1%)
 *   Unit Conversion drops, but ROOT CAUSE is Availability% (96% → 86%),
 *   driven upstream by PO fill rate (88% → 76%).
 *   SOV and content stable — placement is NOT the story.
 *   Same engine + different SkillFile (Nestlé first-suspect=conversion,
 *   drill order [category, brand, sku]) surfaces availability first.
 */

const skus: SkuRow[] = [
  // Coffee — lighthouse category, hardest hit by OOS
  {
    sku: "Nescafé Gold 7oz",
    brand: "Nescafé",
    category: "Coffee",
    revenue: 1_820_000, units: 152_000, glanceViews: 1_900_000,
    priorRevenue: 2_240_000, priorUnits: 175_000, priorGlanceViews: 1_870_000,
    planRevenue: 2_300_000,
    availability: 0.84, priorAvailability: 0.96,
    poFillRate: 0.74, priorPoFillRate: 0.88,
    lostBuyBox: 0.05, contentScore: 0.86, promoRate: 0.18,
    adSpend: 95_000, priorAdSpend: 100_000,
    adSales: 360_000, priorAdSales: 440_000,
    organicSov: 0.41, priorOrganicSov: 0.42,
    paidSov: 0.27, priorPaidSov: 0.27,
  },
  {
    sku: "Coffee mate Original 32oz",
    brand: "Coffee mate",
    category: "Coffee",
    revenue: 1_050_000, units: 132_000, glanceViews: 1_300_000,
    priorRevenue: 1_220_000, priorUnits: 148_000, priorGlanceViews: 1_280_000,
    planRevenue: 1_280_000,
    availability: 0.87, priorAvailability: 0.95,
    poFillRate: 0.78, priorPoFillRate: 0.89,
    lostBuyBox: 0.04, contentScore: 0.82, promoRate: 0.20,
    adSpend: 55_000, priorAdSpend: 58_000,
    adSales: 190_000, priorAdSales: 220_000,
    organicSov: 0.30, priorOrganicSov: 0.31,
    paidSov: 0.20, priorPaidSov: 0.21,
  },
  {
    sku: "NESPRESSO Vertuo Variety",
    brand: "NESPRESSO",
    category: "Coffee",
    revenue: 2_100_000, units: 42_000, glanceViews: 720_000,
    priorRevenue: 2_240_000, priorUnits: 45_000, priorGlanceViews: 695_000,
    planRevenue: 2_400_000,
    availability: 0.92, priorAvailability: 0.97,
    poFillRate: 0.86, priorPoFillRate: 0.92,
    lostBuyBox: 0.03, contentScore: 0.91, promoRate: 0.10,
    adSpend: 130_000, priorAdSpend: 135_000,
    adSales: 520_000, priorAdSales: 560_000,
    organicSov: 0.38, priorOrganicSov: 0.38,
    paidSov: 0.31, priorPaidSov: 0.30,
  },
  // Nutrition
  {
    sku: "NIDO Fortificada 3.52lb",
    brand: "NIDO",
    category: "Nutrition",
    revenue: 740_000, units: 31_000, glanceViews: 460_000,
    priorRevenue: 880_000, priorUnits: 36_000, priorGlanceViews: 455_000,
    planRevenue: 920_000,
    availability: 0.83, priorAvailability: 0.94,
    poFillRate: 0.72, priorPoFillRate: 0.87,
    lostBuyBox: 0.06, contentScore: 0.79, promoRate: 0.14,
    adSpend: 30_000, priorAdSpend: 34_000,
    adSales: 120_000, priorAdSales: 145_000,
    organicSov: 0.27, priorOrganicSov: 0.28,
    paidSov: 0.18, priorPaidSov: 0.19,
  },
  {
    sku: "Garden of Life Protein",
    brand: "Garden of Life",
    category: "Nutrition",
    revenue: 980_000, units: 28_000, glanceViews: 380_000,
    priorRevenue: 1_020_000, priorUnits: 29_500, priorGlanceViews: 360_000,
    planRevenue: 1_100_000,
    availability: 0.93, priorAvailability: 0.95,
    poFillRate: 0.87, priorPoFillRate: 0.90,
    lostBuyBox: 0.05, contentScore: 0.83, promoRate: 0.18,
    adSpend: 48_000, priorAdSpend: 50_000,
    adSales: 175_000, priorAdSales: 195_000,
    organicSov: 0.22, priorOrganicSov: 0.22,
    paidSov: 0.16, priorPaidSov: 0.17,
  },
  // Chocolate — relatively unaffected
  {
    sku: "KitKat Chunky 6pk",
    brand: "KitKat",
    category: "Chocolate",
    revenue: 660_000, units: 96_000, glanceViews: 880_000,
    priorRevenue: 680_000, priorUnits: 98_000, priorGlanceViews: 870_000,
    planRevenue: 700_000,
    availability: 0.96, priorAvailability: 0.97,
    poFillRate: 0.92, priorPoFillRate: 0.93,
    lostBuyBox: 0.03, contentScore: 0.85, promoRate: 0.22,
    adSpend: 22_000, priorAdSpend: 24_000,
    adSales: 95_000, priorAdSales: 105_000,
    organicSov: 0.28, priorOrganicSov: 0.28,
    paidSov: 0.19, priorPaidSov: 0.20,
  },
  {
    sku: "Toll House Morsels 24oz",
    brand: "Toll House",
    category: "Baking",
    revenue: 510_000, units: 78_000, glanceViews: 640_000,
    priorRevenue: 520_000, priorUnits: 80_000, priorGlanceViews: 620_000,
    planRevenue: 540_000,
    availability: 0.97, priorAvailability: 0.97,
    poFillRate: 0.94, priorPoFillRate: 0.94,
    lostBuyBox: 0.03, contentScore: 0.84, promoRate: 0.16,
    adSpend: 14_000, priorAdSpend: 15_000,
    adSales: 60_000, priorAdSales: 64_000,
    organicSov: 0.24, priorOrganicSov: 0.25,
    paidSov: 0.15, priorPaidSov: 0.16,
  },
  // Pet
  {
    sku: "Purina ONE Lamb 16lb",
    brand: "Purina",
    category: "Pet",
    revenue: 1_120_000, units: 38_000, glanceViews: 540_000,
    priorRevenue: 1_180_000, priorUnits: 40_000, priorGlanceViews: 530_000,
    planRevenue: 1_220_000,
    availability: 0.94, priorAvailability: 0.95,
    poFillRate: 0.89, priorPoFillRate: 0.91,
    lostBuyBox: 0.04, contentScore: 0.81, promoRate: 0.20,
    adSpend: 38_000, priorAdSpend: 40_000,
    adSales: 165_000, priorAdSales: 180_000,
    organicSov: 0.26, priorOrganicSov: 0.27,
    paidSov: 0.18, priorPaidSov: 0.19,
  },
];

const keywords: KeywordRow[] = [
  { keyword: "instant coffee", brand: "Nescafé", organicSov: 0.41, priorOrganicSov: 0.42, paidSov: 0.27, priorPaidSov: 0.27, branded: false },
  { keyword: "nescafe gold", brand: "Nescafé", organicSov: 0.62, priorOrganicSov: 0.61, paidSov: 0.45, priorPaidSov: 0.44, branded: true },
  { keyword: "coffee creamer", brand: "Coffee mate", organicSov: 0.30, priorOrganicSov: 0.31, paidSov: 0.20, priorPaidSov: 0.21, branded: false },
  { keyword: "nespresso pods", brand: "NESPRESSO", organicSov: 0.38, priorOrganicSov: 0.38, paidSov: 0.31, priorPaidSov: 0.30, branded: true },
  { keyword: "toddler formula", brand: "NIDO", organicSov: 0.27, priorOrganicSov: 0.28, paidSov: 0.18, priorPaidSov: 0.19, branded: false },
  { keyword: "kitkat", brand: "KitKat", organicSov: 0.51, priorOrganicSov: 0.51, paidSov: 0.32, priorPaidSov: 0.31, branded: true },
];

const trend: TrendPoint[] = (() => {
  const totalNow = skus.reduce((a, s) => a + s.revenue, 0);
  const totalPlan = skus.reduce((a, s) => a + s.planRevenue, 0);
  const totalUnits = skus.reduce((a, s) => a + s.units, 0);
  const totalGv = skus.reduce((a, s) => a + s.glanceViews, 0);
  // Mid-period dip when OOS arrived, slow recovery on the tail.
  const weights = [1.04, 1.03, 1.02, 0.98, 0.90, 0.84, 0.80, 0.86, 0.90, 0.94, 0.98, 1.02, 1.04];
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
  { period: "P-1", us: 0.24, competitor: 0.22 },
  { period: "P0",  us: 0.23, competitor: 0.23 },
];

export const nestleDataset: ClientDataset = {
  clientId: "nestle",
  clientLabel: "Nestlé",
  skus,
  keywords,
  trend,
  marketShare,
};
