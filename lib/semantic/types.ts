import type { RcaNode, AlertName } from "@/lib/rca/mapping";

export type Format = "currency" | "number" | "percent";
export type Comparison = "YoY" | "PvP" | "vsPlan";

export type SemanticMetric = {
  id: string;
  label: string;
  format: Format;
  identityRole?: "traffic" | "conversion" | "asp" | "composite";
  rcaNodes: RcaNode[];
  defaultDims: string[];
  alerts: AlertName[];
  definition: string;
  backendName: string;
};

export type Dimension = {
  id: string;
  label: string;
  values: string[];
};

export type SemanticIntent = {
  metricId: string;
  dimensionIds: string[];
  filters: Record<string, string>;
  timeframe: string;
  comparison: Comparison;
};

export type ChartType = "line" | "bar" | "waterfall" | "kpi" | "table" | "donut";

export type ChartSpec = {
  type: ChartType;
  x?: string;
  y?: string;
  series?: string[];
  ref?: number;
};

export type ComputeRow = Record<string, string | number>;

export type ComputeResult = {
  rows: ComputeRow[];
  total: number;
  prior: number;
  comparisonDelta: { absolute: number; pct: number };
  chartSpec: ChartSpec;
  notes?: string[];
};

export type SemanticRegistry = {
  metrics: SemanticMetric[];
  dimensions: Dimension[];
};
