export type SkuRow = {
  sku: string;
  brand: string;
  category: string;
  // current period
  revenue: number;
  units: number;
  glanceViews: number;
  // prior period (PvP / LY)
  priorRevenue: number;
  priorUnits: number;
  priorGlanceViews: number;
  // plan
  planRevenue: number;
  // operational
  availability: number; // 0..1
  priorAvailability: number;
  poFillRate: number; // 0..1
  priorPoFillRate: number;
  lostBuyBox: number; // 0..1
  contentScore: number; // 0..1
  promoRate: number; // 0..1
  adSpend: number;
  priorAdSpend: number;
  adSales: number;
  priorAdSales: number;
  organicSov: number; // 0..1, average across tracked keywords
  priorOrganicSov: number;
  paidSov: number;
  priorPaidSov: number;
};

export type KeywordRow = {
  keyword: string;
  brand: string;
  organicSov: number;
  priorOrganicSov: number;
  paidSov: number;
  priorPaidSov: number;
  branded: boolean;
};

export type TrendPoint = {
  week: string;
  revenue: number;
  plan: number;
  units: number;
  glanceViews: number;
  conversion: number;
};

export type ClientDataset = {
  clientId: string;
  clientLabel: string;
  skus: SkuRow[];
  keywords: KeywordRow[];
  trend: TrendPoint[];
  marketShare: { period: string; us: number; competitor: number }[];
};
