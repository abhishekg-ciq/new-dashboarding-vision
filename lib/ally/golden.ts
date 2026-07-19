import { getDataset } from "@/lib/data";
import type { ClientDataset } from "@/lib/data/types";
import { compute } from "@/lib/semantic/compute";
import { getMetric } from "@/lib/semantic/registry";
import type { ChartType, ComputeResult, SemanticIntent } from "@/lib/semantic/types";
import {
  attributeUnits,
  decomposeGap,
  expandNode,
  generateRecommendation,
  rankContributors,
  runFirstPass,
  type EvidenceCard,
} from "@/lib/rca/engine";
import type { SkillFile } from "@/lib/skills/types";

/**
 * Chat_Dashboarding_Golden_Set_v1 support. This app's /api/ally resolver is a
 * deterministic, keyword-driven demo engine (no live NLQ) — this registry is
 * the same style, scoped to the exact utterances (and close paraphrases) in
 * the golden set, so the demo can walk through it question by question.
 */

export type GoldenWidget = {
  title: string;
  intent: SemanticIntent;
  result: ComputeResult;
  vizType?: ChartType;
};

export type GoldenResponse =
  | { kind: "widgets"; reply: string; widgets: GoldenWidget[]; dashboardDraft?: boolean }
  | { kind: "evidence"; reply: string; cards: EvidenceCard[] }
  | { kind: "clarify"; reply: string; questions: string[] }
  | { kind: "guardrail"; reply: string; alternative: string };

export type GoldenContext = {
  clientId: string;
  skill: SkillFile;
  /** The most recently rendered widget's intent, for "this widget" edit commands (rows 16-18). */
  lastIntent?: SemanticIntent;
};

function lower(nl: string) {
  return nl.toLowerCase();
}

function hasAll(nl: string, words: string[]) {
  const l = lower(nl);
  return words.every((w) => l.includes(w));
}

function hasAny(nl: string, words: string[]) {
  const l = lower(nl);
  return words.some((w) => l.includes(w));
}

function findToken(nl: string, candidates: string[]): string | undefined {
  const l = lower(nl);
  return candidates.find((c) => l.includes(c.toLowerCase()));
}

function money(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${v < 0 ? "-" : ""}$${Math.abs(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${v < 0 ? "-" : ""}$${Math.abs(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function pct(v: number) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(1)}%`;
}

/** One ComputeResult whose rows are one-per-metric — a multi-metric summary table in a single widget. */
function multiMetricTable(
  metricIds: string[],
  base: Omit<SemanticIntent, "metricId">,
  clientId: string,
): ComputeResult {
  const rows = metricIds.map((id) => {
    const r = compute({ ...base, metricId: id }, clientId);
    const m = getMetric(id);
    return {
      key: m?.label ?? id,
      now: r.total,
      prior: r.prior,
      delta: r.comparisonDelta.absolute,
      pct: Number((r.comparisonDelta.pct * 100).toFixed(2)),
    };
  });
  return {
    rows,
    total: rows[0]?.now ?? 0,
    prior: rows[0]?.prior ?? 0,
    comparisonDelta: rows[0] ? { absolute: rows[0].delta, pct: rows[0].pct / 100 } : { absolute: 0, pct: 0 },
    chartSpec: { type: "table" },
    notes: [],
  };
}

function widget(title: string, intent: SemanticIntent, clientId: string, vizType?: ChartType): GoldenWidget {
  return { title, intent, result: compute(intent, clientId), vizType };
}

function revenueMetricId(skill: SkillFile) {
  return skill.primaryMetric;
}

function rcaCtx(clientId: string, skill: SkillFile, metricId?: string) {
  return { clientId, metricId: metricId || skill.primaryMetric, skill };
}

// ── Row 8: brand-scoped identity decomposition (RCA engine functions accept any ClientDataset) ──
function brandDecomposition(clientId: string, skill: SkillFile, brandQuery?: string): { card: EvidenceCard; brand: string } {
  const ds = getDataset(clientId);
  const brands = Array.from(new Set(ds.skus.map((s) => s.brand)));
  let brand = brandQuery ? brands.find((b) => b.toLowerCase().includes(brandQuery.toLowerCase())) : undefined;
  let substituted = false;
  if (!brand) {
    // Fall back to the brand with the largest absolute revenue swing so the demo still shows something real.
    const byBrand = new Map<string, number>();
    for (const s of ds.skus) byBrand.set(s.brand, (byBrand.get(s.brand) || 0) + (s.revenue - s.priorRevenue));
    brand = Array.from(byBrand.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]?.[0] || brands[0];
    substituted = true;
  }
  const filtered: ClientDataset = { ...ds, skus: ds.skus.filter((s) => s.brand === brand) };
  const attr = attributeUnits(filtered);
  const ranked = rankContributors(filtered);
  const c = attr.contributions;
  const worst = ranked[0];
  const card: EvidenceCard = {
    id: `golden-brand-${Date.now()}`,
    level: "L1",
    node: "L1: Revenue attribution (Traffic × Conversion × ASP)",
    title: `${brand}: revenue identity decomposition`,
    metric: skill.primaryMetric,
    facts: {
      unitsDeltaPct: Number((attr.unitsPct * 100).toFixed(1)),
      aspDeltaPct: Number((attr.aspPct * 100).toFixed(1)),
      gvDeltaPct: Number((attr.gvPct * 100).toFixed(1)),
      cvrDeltaPct: Number((attr.cvrPct * 100).toFixed(1)),
      gvContribution: Math.round(c.gv),
      conversionContribution: Math.round(c.conversion),
      aspContribution: Math.round(c.asp),
    },
    narrative:
      `${substituted ? `No brand named in the question matches this dataset — showing ${brand}, the brand with the largest revenue swing. ` : ""}` +
      `Units ${pct(attr.unitsPct)}, ASP ${pct(attr.aspPct)}, GV ${pct(attr.gvPct)}, Conversion ${pct(attr.cvrPct)}. ` +
      `Contribution to revenue Δ — Traffic ${money(c.gv)}, Conversion ${money(c.conversion)}, ASP ${money(c.asp)}. ` +
      `${worst ? `Worst SKU contributor: ${worst.sku} (${money(worst.deltaRevenue)}).` : ""}`,
    chart: { type: "waterfall", series: [
      { label: "Traffic", value: c.gv },
      { label: "Conversion", value: c.conversion },
      { label: "ASP", value: c.asp },
    ] },
    source: "first-pass",
  };
  return { card, brand };
}

// ── Row 13: forward-looking ROI ranking (ROAS proxy — not a registered metric) ──
function roasRanking(clientId: string): ComputeResult {
  const ds = getDataset(clientId);
  const rows = ds.skus
    .map((s) => ({
      key: s.sku,
      now: s.adSpend > 0 ? Number((s.adSales / s.adSpend).toFixed(2)) : 0,
      prior: s.priorAdSpend > 0 ? Number((s.priorAdSales / s.priorAdSpend).toFixed(2)) : 0,
      delta: 0,
      pct: 0,
    }))
    .map((r) => ({ ...r, delta: Number((r.now - r.prior).toFixed(2)) }))
    .sort((a, b) => b.now - a.now)
    .slice(0, 10);
  return {
    rows,
    total: rows[0]?.now ?? 0,
    prior: rows[0]?.prior ?? 0,
    comparisonDelta: { absolute: rows[0]?.delta ?? 0, pct: 0 },
    chartSpec: { type: "table" },
    notes: ["ROAS = trailing-period ad sales / ad spend, used as a forward-looking proxy — no true projection model in this dataset."],
  };
}

type Registry = {
  id: number;
  test: (nl: string, ctx: GoldenContext) => boolean;
  respond: (nl: string, ctx: GoldenContext) => GoldenResponse;
};

const registry: Registry[] = [
  // ── F. Guardrail — cross-grain refusal (row 25) ──
  {
    id: 25,
    test: (nl) => hasAll(nl, ["sov"]) && hasAll(nl, ["sku"]) && hasAny(nl, ["next to", "same dashboard", "one dashboard", "alongside"]),
    respond: () => ({
      kind: "guardrail",
      reply:
        "SOV is tracked at keyword grain and SKU sales at SKU grain — those don't share a conformed dimension, so putting them on one dashboard would collapse the global filter set (single-grain dashboards, INV-7).",
      alternative: "View them as two separate dashboards, or use a SKU-attributed SOV metric if one is registered for this account.",
    }),
  },

  // ── E. Clarify-first (rows 20, 23) — narrow triggers so they don't swallow the diagnostic rows below ──
  {
    id: 20,
    test: (nl) => hasAll(nl, ["why"]) && hasAny(nl, ["conversion", "cvr"]) && hasAny(nl, ["drop", "fall", "decline"]) && !hasAny(nl, ["plan", "brand", "week", "period", "month"]),
    respond: () => ({
      kind: "clarify",
      reply: "Conversion drop is ambiguous scoped this broadly — I need to narrow it before rendering anything.",
      questions: ["Which period, and vs. which comparison (prior period, plan, last year)?", "Whole business, or a specific brand/category?"],
    }),
  },
  {
    id: 23,
    test: (nl) => hasAll(nl, ["what should i do"]) && hasAny(nl, ["category"]) && !hasAny(nl, ["plan", "week", "month", "quarter"]),
    respond: () => ({
      kind: "clarify",
      reply: "The lens matters here — diagnosing a known problem and hunting for opportunity render very differently.",
      questions: [
        "Are we diagnosing a known drop, or looking for opportunities?",
        "Sales, availability, promo, or pricing angle?",
        "What date range?",
      ],
    }),
  },

  // ── D. Action / Command — edits to "this widget" (rows 16-18), need ctx.lastIntent ──
  {
    id: 16,
    test: (nl) => hasAny(nl, ["add"]) && hasAny(nl, ["this widget"]) && hasAny(nl, ["net sales", "revenue", "asp", "average selling price", "selling price"]),
    respond: (nl, ctx) => {
      const base = ctx.lastIntent || { metricId: ctx.skill.primaryMetric, dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison };
      const revId = ctx.skill.primaryMetric;
      const widgets = [
        widget(getMetric(base.metricId)?.label || base.metricId, base, ctx.clientId),
        widget(getMetric(revId)?.label || "Net Sales", { ...base, metricId: revId }, ctx.clientId),
        widget("Average Selling Price", { ...base, metricId: "asp" }, ctx.clientId),
      ];
      return {
        kind: "widgets",
        reply: `Added Net Sales and ASP to the widget${ctx.lastIntent ? "" : " (no prior widget in this session — showing a default base)"}. Each metric renders as its own card in this prototype; apply to persist.`,
        widgets,
      };
    },
  },
  {
    id: 17,
    test: (nl) => hasAll(nl, ["break"]) && hasAll(nl, ["down"]) && hasAll(nl, ["sku"]) && hasAny(nl, ["instead of", "instead"]),
    respond: (nl, ctx) => {
      const base = ctx.lastIntent || { metricId: ctx.skill.primaryMetric, dimensionIds: ["brand"], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison };
      const next = { ...base, dimensionIds: ["sku"] };
      return {
        kind: "widgets",
        reply: `Dimension swapped to SKU${ctx.lastIntent ? "" : " (no prior widget in this session — showing a default base)"}.`,
        widgets: [widget(`${getMetric(next.metricId)?.label || next.metricId} by SKU`, next, ctx.clientId)],
      };
    },
  },
  {
    id: 18,
    test: (nl) => hasAll(nl, ["change"]) && hasAll(nl, ["chart"]) && hasAny(nl, ["line"]),
    respond: (nl, ctx) => {
      const base = ctx.lastIntent || { metricId: ctx.skill.primaryMetric, dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison };
      const eligible: ChartType[] = base.dimensionIds.length === 0 ? ["line", "bar", "kpi"] : ["bar", "table"];
      if (!eligible.includes("line")) {
        return {
          kind: "widgets",
          reply: `Line isn't eligible for a dimensional breakdown (one series per category, no continuous x-axis to plot). Eligible viz here: ${eligible.join(", ")}. Widget unchanged.`,
          widgets: [widget(getMetric(base.metricId)?.label || base.metricId, base, ctx.clientId)],
        };
      }
      return {
        kind: "widgets",
        reply: "Rendered as a line chart.",
        widgets: [widget(getMetric(base.metricId)?.label || base.metricId, base, ctx.clientId, "line")],
      };
    },
  },

  // ── D. Action / Command — create dashboard (row 19, FDE-only, single-grain) ──
  {
    id: 19,
    test: (nl) => hasAll(nl, ["create a dashboard"]) && hasAny(nl, ["3 widgets", "three widgets"]),
    respond: (nl, ctx) => {
      const revId = revenueMetricId(ctx.skill);
      const base: Omit<SemanticIntent, "metricId" | "dimensionIds"> = { filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison };
      const w1 = widget("Revenue trend", { ...base, metricId: revId, dimensionIds: [] }, ctx.clientId, "line");
      const w2: GoldenWidget = {
        title: "Business performance summary",
        intent: { ...base, metricId: revId, dimensionIds: [] },
        result: multiMetricTable([revId, "asp", "ordered_units"], { dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison }, ctx.clientId),
      };
      const w3 = widget("Sales performance by brand", { ...base, metricId: revId, dimensionIds: ["brand"] }, ctx.clientId, "bar");
      return {
        kind: "widgets",
        reply:
          "All 3 widgets share one grain (brand/category-conformed), so they can live on a single dashboard. Dashboard creation from blank is an FDE capability in v1 — end users add these to an existing dashboard instead.",
        widgets: [w1, w2, w3],
        dashboardDraft: true,
      };
    },
  },

  // ── D. Action / Command — create widget, traffic KPI set (row 15) ──
  {
    id: 15,
    test: (nl) => hasAll(nl, ["create a widget"]) && hasAny(nl, ["traffic"]),
    respond: (nl, ctx) => ({
      kind: "widgets",
      reply: "Preview only — Pin or Save as dashboard to persist.",
      widgets: [
        {
          title: "Traffic KPIs",
          intent: { metricId: "glance_views", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison },
          result: multiMetricTable(
            ["glance_views", "organic_glance_views", "paid_glance_views", "unit_conversion"],
            { dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison },
            ctx.clientId,
          ),
        },
      ],
    }),
  },

  // ── B/C. Diagnostic/prescriptive — brand-scoped drivers (row 8) ──
  {
    id: 8,
    test: (nl) => hasAny(nl, ["primary drivers", "what drove", "what's driving"]) && hasAny(nl, ["units", "asp", "conversion"]) && hasAny(nl, ["brand"]),
    respond: (nl, ctx) => {
      const m = /brand\s+([a-z0-9][\w'\-]*(?:\s+[a-z0-9][\w'\-]*)?)/i.exec(nl);
      const { card } = brandDecomposition(ctx.clientId, ctx.skill, m?.[1]);
      return { kind: "evidence", reply: card.narrative, cards: [card] };
    },
  },

  // ── B. Diagnostic — promo effectiveness (row 11) ──
  {
    id: 11,
    test: (nl) => hasAny(nl, ["promo"]) && hasAny(nl, ["successful", "effective", "worked", "incremental"]),
    respond: (nl, ctx) => {
      const base = { dimensionIds: [] as string[], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison };
      const w1 = widget("Promo rate · trend", { ...base, metricId: "promo_rate" }, ctx.clientId);
      const w2 = widget("Promo rate by brand", { ...base, metricId: "promo_rate", dimensionIds: ["brand"] }, ctx.clientId, "bar");
      return {
        kind: "widgets",
        reply:
          "This seeded dataset has no promo-window tagging, so there's no true baseline-vs-lift calculation — showing promo rate trend and brand breakdown as the closest proxy. A real lift measure needs promo start/end dates and a pre-promo baseline window.",
        widgets: [w1, w2],
      };
    },
  },

  // ── C. Prescriptive — ROI-ranked SKUs (row 13) ──
  {
    id: 13,
    test: (nl) => hasAny(nl, ["increase spend", "increase my spend", "increase budget"]) && hasAny(nl, ["roi", "return"]),
    respond: (nl, ctx) => ({
      kind: "widgets",
      reply: "Ranked by trailing-period ROAS as a forward-looking proxy — no projection model in this dataset. Top of the list are the best spend-increase candidates.",
      widgets: [{ title: "Top SKUs by ROAS (spend-increase candidates)", intent: { metricId: "ad_sales", dimensionIds: ["sku"], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison }, result: roasRanking(ctx.clientId) }],
    }),
  },

  // ── B. Diagnostic — why did I not meet my plan (row 10) ──
  {
    id: 10,
    test: (nl) => hasAny(nl, ["why"]) && hasAny(nl, ["meet my plan", "meet plan", "not meet plan"]),
    respond: (nl, ctx) => {
      const fp = runFirstPass(rcaCtx(ctx.clientId, ctx.skill));
      return {
        kind: "evidence",
        reply: fp.cards.map((c) => c.narrative).join(" "),
        cards: fp.cards,
      };
    },
  },

  // ── C. Prescriptive — what to focus on to hit sales goal (row 12) ──
  {
    id: 12,
    test: (nl) => hasAny(nl, ["focus on", "need to focus"]) && hasAny(nl, ["sales goal", "hit my goal", "hit my sales"]),
    respond: (nl, ctx) => {
      const fp = runFirstPass(rcaCtx(ctx.clientId, ctx.skill));
      const reco = generateRecommendation(rcaCtx(ctx.clientId, ctx.skill), fp.cards);
      const actionsText = reco.actions.map((a, i) => `${i + 1}) ${a.label} (${a.owner})`).join("  ·  ");
      return {
        kind: "evidence",
        reply: `${reco.rationale} Next best actions: ${actionsText}.`,
        cards: fp.cards,
      };
    },
  },

  // ── B. Diagnostic — 90-day trend + drivers (row 7) ──
  {
    id: 7,
    test: (nl) => hasAny(nl, ["what happened to my"]) && hasAny(nl, ["90 days", "last 90"]),
    respond: (nl, ctx) => {
      const fp = runFirstPass(rcaCtx(ctx.clientId, ctx.skill));
      return { kind: "evidence", reply: fp.cards.slice(0, 2).map((c) => c.narrative).join(" "), cards: fp.cards.slice(0, 2) };
    },
  },

  // ── A. Descriptive — top-20 SKUs losing the most (row 6) ──
  {
    id: 6,
    test: (nl) => hasAny(nl, ["losing the most", "declining the most"]) && hasAny(nl, ["sku"]),
    respond: (nl, ctx) => {
      const revId = revenueMetricId(ctx.skill);
      const r = compute({ metricId: revId, dimensionIds: ["sku"], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison }, ctx.clientId);
      const rows = [...r.rows].sort((a: any, b: any) => a.delta - b.delta).slice(0, 20);
      return {
        kind: "widgets",
        reply: `Ranked by absolute revenue decline, worst first. ${rows.length} SKU(s) shown.`,
        widgets: [{ title: "Top 20 SKUs losing the most revenue", intent: { metricId: revId, dimensionIds: ["sku"], filters: {}, timeframe: "trailing-13w", comparison: ctx.skill.comparison }, result: { ...r, rows } }],
      };
    },
  },

  // ── A. Descriptive — traffic in a category (row 4) ──
  {
    id: 4,
    test: (nl) => hasAny(nl, ["how is my traffic", "how are my traffic", "traffic performing"]),
    respond: (nl, ctx) => {
      const ds = getDataset(ctx.clientId);
      const categories = Array.from(new Set(ds.skus.map((s) => s.category)));
      const cat = findToken(nl, categories) || categories[0];
      const base = { dimensionIds: [] as string[], filters: { category: cat }, timeframe: "trailing-13w", comparison: ctx.skill.comparison };
      return {
        kind: "widgets",
        reply: `Scoped to ${cat}. This dataset's traffic set covers glance views (organic + paid) and conversion — there's no add-to-cart step modeled, so that's approximated by unit conversion.`,
        widgets: [{ title: `Traffic KPIs · ${cat}`, intent: { ...base, metricId: "glance_views" }, result: multiMetricTable(["glance_views", "organic_glance_views", "paid_glance_views", "unit_conversion"], base, ctx.clientId) }],
      };
    },
  },

  // ── A. Descriptive — channel contribution to growth (row 2, no channel dim in this dataset → category proxy) ──
  {
    id: 2,
    test: (nl) => hasAny(nl, ["contribution"]) && hasAny(nl, ["growth"]) && hasAny(nl, ["digital", "in-store", "channel"]),
    respond: (nl, ctx) => {
      const revId = revenueMetricId(ctx.skill);
      const base = { dimensionIds: ["category"], filters: {}, timeframe: "mtd", comparison: ctx.skill.comparison };
      return {
        kind: "widgets",
        reply: "This dataset doesn't track offline/in-store channel — showing category as the closest available growth-contribution breakdown.",
        widgets: [
          widget("Revenue by category", { ...base, metricId: revId }, ctx.clientId, "table"),
          widget("Growth contribution by category", { ...base, metricId: revId }, ctx.clientId, "bar"),
        ],
      };
    },
  },

  // ── A. Descriptive — total business this week vs last year, all channels (row 1) ──
  {
    id: 1,
    test: (nl) => hasAny(nl, ["total business", "overall business"]) && hasAny(nl, ["week"]) && hasAny(nl, ["last year", "yoy", "year over year", "sply"]),
    respond: (nl, ctx) => {
      const base = { dimensionIds: [] as string[], filters: {}, timeframe: "wtd", comparison: "YoY" as const };
      return {
        kind: "widgets",
        reply: "This dataset doesn't track offline/in-store channel, so this is shown at total tracked-channel level.",
        widgets: [{ title: "Total business · this week vs SPLY", intent: { ...base, metricId: revenueMetricId(ctx.skill) }, result: multiMetricTable([revenueMetricId(ctx.skill), "asp", "ordered_units"], base, ctx.clientId) }],
      };
    },
  },

  // ── A. Descriptive — trending week over week (row 3) ──
  {
    id: 3,
    test: (nl) => hasAny(nl, ["week over week"]) && hasAny(nl, ["trend"]),
    respond: (nl, ctx) => {
      const intent: SemanticIntent = { metricId: revenueMetricId(ctx.skill), dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "PvP" };
      return { kind: "widgets", reply: "Weekly trend, period-over-period.", widgets: [widget("Sales performance · weekly trend", intent, ctx.clientId, "line")] };
    },
  },
];

export function matchGolden(nl: string, ctx: GoldenContext): GoldenResponse | null {
  const entry = registry.find((r) => r.test(nl, ctx));
  return entry ? entry.respond(nl, ctx) : null;
}
