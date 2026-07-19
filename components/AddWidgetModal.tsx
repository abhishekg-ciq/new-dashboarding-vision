"use client";
import { useEffect, useMemo, useState } from "react";
import { semanticRegistry } from "@/lib/semantic/registry";
import type { SemanticMetric } from "@/lib/semantic/types";
import type { ExtraWidget } from "@/lib/dashboards/edits";
import type { WidgetCard, WidgetCardShape } from "@/lib/data/widgetCardTypes";
import rawLibrary from "@/context/widget_card_library.json";

const CARDS = rawLibrary.cards as WidgetCard[];

// ── Catalog constants ──────────────────────────────────────────────────────────

const TOPIC_ORDER = [
  "All",
  "Sales & Traffic",
  "Digital Shelf",
  "Advertising",
  "Share of Voice",
  "Budget",
] as const;
type TopicFilter = (typeof TOPIC_ORDER)[number];

const MOMENTS = [
  { id: "all",         label: "All"            },
  { id: "monitor",     label: "Monitor"        },
  { id: "diagnose",    label: "Diagnose"       },
  { id: "opportunity", label: "Find opportunity"},
] as const;
type MomentFilter = (typeof MOMENTS)[number]["id"];

// Metric name (as used in card library) → semantic registry ID
const METRIC_NAME_TO_ID: Record<string, string> = {
  "Ordered Revenue":              "ordered_revenue",
  "Shipped Revenue":              "shipped_revenue",
  "Ordered Units":                "ordered_units",
  "Average Selling Price":        "asp",
  "Glance Views":                 "glance_views",
  "Organic Glance Views":         "organic_glance_views",
  "Paid Glance Views":            "paid_glance_views",
  "Unit Conversion":              "unit_conversion",
  "Organic SOV":                  "organic_sov",
  "Paid SOV":                     "paid_sov",
  "Total SOV":                    "organic_sov",
  "Total Sponsored SOV":          "paid_sov",
  "Ad Spend":                     "ad_spend",
  "Ad Sales":                     "ad_sales",
  "Availability %":               "availability",
  "LBB %":                        "lost_buy_box",
  "Content Score":                "content_score",
  "Promo Rate":                   "promo_rate",
  "Avg Rating":                   "rating",
  "Market Share":                 "market_share",
  "Category Size":                "category_size",
  "PO Fill Rate":                 "po_fill_rate",
  "Revenue Lost to Unavailability": "availability",
  "% OPS Loss due to LBB":        "lost_buy_box",
  "No. of LBB Days":              "lost_buy_box",
  "Revenue Lost due to LBB":      "lost_buy_box",
  "ROAS":                         "ad_spend",
  "IROAS":                        "ad_spend",
  "CTR":                          "ad_spend",
  "CPC":                          "ad_spend",
  "Impressions":                  "glance_views",
  "Clicks":                       "glance_views",
  "Ad-Attributed Sales":          "ad_sales",
  "OPS":                          "ordered_units",
  "Incremental Sales":            "ad_sales",
  "Incremental Fraction":         "ad_sales",
  "Total Budget":                 "ad_spend",
  "Planned Budget":               "ad_spend",
  "Actual Spend":                 "ad_spend",
  "Spend Status":                 "ad_spend",
  "Remaining Budget":             "ad_spend",
};

function resolveMetrics(metrics: string[]): { primary: string; added: string[] } {
  const primary = METRIC_NAME_TO_ID[metrics[0]] ?? "ordered_revenue";
  const seen = new Set([primary]);
  const added = metrics.slice(1)
    .map((m) => METRIC_NAME_TO_ID[m] ?? null)
    .filter((id): id is string => id !== null && !seen.has(id) && Boolean(seen.add(id)));
  return { primary, added };
}

function parseDimensionIds(dim: string | null): string[] {
  if (!dim) return [];
  const dimMap: Record<string, string> = {
    brand: "brand",
    category: "category",
    sku: "sku",
    keyword: "keyword",
    campaign: "campaign",
    "sub category": "category",
  };
  const seen = new Set<string>();
  return dim.split(">")
    .map((d) => dimMap[d.trim().toLowerCase()] ?? "brand")
    .filter((id) => { if (seen.has(id)) return false; seen.add(id); return true; });
}

// TODO: time_matrix → table fallback until dedicated time-matrix renderer exists
function shapeToVizType(shape: WidgetCardShape): "line" | "bar" | "table" | "kpi" {
  if (shape === "kpi_cards") return "kpi";
  if (shape === "line")      return "line";
  if (shape === "bar")       return "bar";
  if (shape === "stacked_bar") return "bar";
  if (shape === "table")     return "table";
  if (shape === "time_matrix") return "table";
  if (shape === "pie")       return "bar";
  return "table";
}

function intentLabel(intent: string): string {
  if (intent === "scorecard") return "Scorecard";
  if (intent === "trend")     return "Trend";
  return "Breakdown";
}

function dimFooterLabel(dim: string | null): string {
  if (!dim) return "no breakdown";
  const parts = dim.split(">");
  if (parts.length === 1) return `by ${parts[0]}`;
  return `by ${parts[0]} › ${parts[parts.length - 1]}`;
}

function shapeFooterLabel(shape: string): string {
  const labels: Record<string, string> = {
    kpi_cards: "kpi", line: "line", bar: "bar",
    stacked_bar: "stacked bar", table: "table", time_matrix: "table", pie: "pie",
  };
  return labels[shape] ?? shape;
}

// ── Scratch-builder constants (from prior implementation) ──────────────────────

type TopicId    = "all" | "sales" | "shelf" | "advertising";
type BreakdownId = "total" | "time" | "brand" | "category" | "sku" | "keyword" | "campaign";
type ShapeId    = "kpi" | "line" | "bar" | "table";

const SCRATCH_TOPICS: { id: TopicId; label: string }[] = [
  { id: "all",         label: "All"             },
  { id: "sales",       label: "Sales & Traffic" },
  { id: "shelf",       label: "Digital Shelf"   },
  { id: "advertising", label: "Advertising"     },
];

const TOPIC_METRICS: Record<Exclude<TopicId, "all">, string[]> = {
  sales: [
    "shipped_revenue", "ordered_revenue", "ordered_units", "asp",
    "glance_views", "organic_glance_views", "paid_glance_views", "unit_conversion",
  ],
  shelf: [
    "availability", "po_fill_rate", "lost_buy_box", "content_score",
    "organic_sov", "paid_sov", "promo_rate", "rating", "unit_conversion",
  ],
  advertising: ["ad_spend", "ad_sales", "market_share", "category_size"],
};

const DIM_TO_BREAKDOWN: Record<string, BreakdownId> = {
  brand: "brand", category: "category", sku: "sku",
  keyword: "keyword", campaign: "campaign",
};

const BREAKDOWN_LABELS: Record<BreakdownId, string> = {
  total: "Total", time: "Over Time",
  brand: "by Brand", category: "by Category", sku: "by SKU",
  keyword: "by Keyword", campaign: "by Campaign",
};

function breakdownsFor(metric: SemanticMetric): BreakdownId[] {
  const dimBds = metric.defaultDims
    .map((d) => DIM_TO_BREAKDOWN[d])
    .filter(Boolean) as BreakdownId[];
  return ["total", "time", ...dimBds];
}

function shapesFor(bd: BreakdownId): ShapeId[] {
  if (bd === "total") return ["kpi", "table"];
  if (bd === "time")  return ["line", "bar"];
  return ["bar", "table"];
}

function defaultShape(bd: BreakdownId): ShapeId {
  return shapesFor(bd)[0];
}

function scratchResolvedName(metricLabel: string, bd: BreakdownId, shape: ShapeId): string {
  if (bd === "total" && shape === "kpi")   return metricLabel;
  if (bd === "total" && shape === "table") return `${metricLabel} (Table)`;
  if (bd === "time"  && shape === "line")  return `${metricLabel} Trend`;
  if (bd === "time"  && shape === "bar")   return `${metricLabel} Trend (Bar)`;
  const dimLabel = BREAKDOWN_LABELS[bd];
  return shape === "table"
    ? `${metricLabel} ${dimLabel} (Table)`
    : `${metricLabel} ${dimLabel}`;
}

const SHAPE_ICONS: Record<ShapeId, React.ReactNode> = {
  kpi: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <text x="2" y="18" fontSize="13" fontWeight="700" fontFamily="sans-serif">42</text>
    </svg>
  ),
  line: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <polyline points="3,17 8,10 13,14 21,5" />
    </svg>
  ),
  bar: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="3"  y="10" width="4" height="12" rx="1" />
      <rect x="10" y="5"  width="4" height="17" rx="1" />
      <rect x="17" y="14" width="4" height="8"  rx="1" />
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="2"  y1="9"  x2="22" y2="9"  />
      <line x1="2"  y1="15" x2="22" y2="15" />
      <line x1="9"  y1="3"  x2="9"  y2="21" />
      <line x1="15" y1="3"  x2="15" y2="21" />
    </svg>
  ),
};

const SHAPE_LABELS: Record<ShapeId, string> = {
  kpi: "KPI Card", line: "Trend Line", bar: "Bar Chart", table: "Table",
};

// ── Intent icons ───────────────────────────────────────────────────────────────

function ScorecardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}

function BreakdownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  );
}

function IntentIcon({ intent }: { intent: string }) {
  if (intent === "scorecard") return <ScorecardIcon />;
  if (intent === "trend")     return <TrendIcon />;
  return <BreakdownIcon />;
}

// ── Card grid item ─────────────────────────────────────────────────────────────

function CardItem({
  card,
  selected,
  onSelect,
}: {
  card: WidgetCard;
  selected: boolean;
  onSelect: () => void;
}) {
  const primaryMetric = card.metrics[0] ?? "";
  const extraCount = card.metrics.length - 1;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border px-3 py-3 transition flex flex-col gap-2 ${
        selected
          ? "border-[var(--violet-500)] bg-[var(--violet-50)] ring-1 ring-[var(--violet-400)]"
          : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--violet-300)] hover:bg-[var(--violet-50)]"
      }`}
    >
      {/* Icon + title row */}
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${selected ? "text-[var(--violet-600)]" : "text-[var(--fg-muted)]"}`}>
          <IntentIcon intent={card.intent} />
        </span>
        <span className={`text-[12px] font-semibold leading-snug ${selected ? "text-[var(--violet-700)]" : "text-[var(--fg)]"}`}>
          {card.title}
        </span>
      </div>

      {/* Subtitle */}
      <p className="text-[11px] text-[var(--fg-muted)] leading-snug line-clamp-2">
        {card.subtitle}
      </p>

      {/* Metadata footer */}
      <div className="text-[10px] text-[var(--fg-muted)] pt-1 border-t border-[var(--border)] flex items-center gap-1 flex-wrap">
        <span className="font-medium">{intentLabel(card.intent)}</span>
        <span className="opacity-40">·</span>
        <span className="truncate max-w-[120px]">
          {primaryMetric}
          {extraCount > 0 && ` +${extraCount}`}
        </span>
        <span className="opacity-40">·</span>
        <span>{dimFooterLabel(card.default_dimension)}</span>
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Tab        = "build" | "ally";
type BuildView  = "catalog" | "scratch";

export default function AddWidgetModal({
  onAdd,
  onClose,
  onOpenAlly,
}: {
  onAdd: (widget: ExtraWidget) => void;
  onClose: () => void;
  onOpenAlly?: (prefill?: string) => void;
}) {
  // ── Shared ────────────────────────────────────────────────────────────────────
  const [tab,       setTab]       = useState<Tab>("build");
  const [buildView, setBuildView] = useState<BuildView>("catalog");

  // ── Catalog state ──────────────────────────────────────────────────────────
  const [topicFilter,   setTopicFilter]   = useState<TopicFilter>("All");
  const [momentFilter,  setMomentFilter]  = useState<MomentFilter>("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // ── Scratch builder state ─────────────────────────────────────────────────
  const [scratchTopic,     setScratchTopic]     = useState<TopicId>("sales");
  const [scratchSearch,    setScratchSearch]    = useState("");
  const [scratchMetricId,  setScratchMetricId]  = useState<string | null>(null);
  const [scratchBreakdown, setScratchBreakdown] = useState<BreakdownId | null>(null);
  const [scratchShape,     setScratchShape]     = useState<ShapeId | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Filtered cards ─────────────────────────────────────────────────────────
  const filteredCards = useMemo(() => {
    let list = CARDS;
    if (topicFilter !== "All") {
      list = list.filter((c) => c.topic === topicFilter);
    }
    if (momentFilter !== "all") {
      list = list.filter((c) => c.moment === momentFilter);
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.trim().toLowerCase();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.search_tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [topicFilter, momentFilter, catalogSearch]);

  const selectedCard = selectedCardId ? CARDS.find((c) => c.id === selectedCardId) : null;

  const catalogFooterLabel = selectedCard
    ? `${selectedCard.title} · ${intentLabel(selectedCard.intent)} · ${shapeFooterLabel(selectedCard.default_shape)}`
    : null;

  function handleCatalogAdd() {
    if (!selectedCard) return;
    const { primary, added } = resolveMetrics(selectedCard.metrics);
    const vizType = shapeToVizType(selectedCard.default_shape);
    const dimIds  = parseDimensionIds(selectedCard.default_dimension);

    const w: ExtraWidget = {
      id:      `card-${selectedCard.id}-${Date.now()}`,
      title:   selectedCard.title,
      size:    dimIds.includes("sku") ? "lg" : "md",
      vizType,
      intent: {
        metricId:     primary,
        dimensionIds: dimIds,
        filters:      {},
        timeframe:    "trailing-13w",
        comparison:   "PvP",
      },
      ...(added.length       ? { addedMetricIds: added }                    : {}),
      ...(selectedCard.filter_hint ? { insightContext: selectedCard.filter_hint } : {}),
    };
    onAdd(w);
    onClose();
  }

  // ── Scratch builder helpers ────────────────────────────────────────────────
  const allMetrics = semanticRegistry.metrics;

  function selectScratchTopic(t: TopicId) {
    setScratchTopic(t);
    setScratchSearch("");
    if (t !== "all" && scratchMetricId) {
      const inTopic = TOPIC_METRICS[t as Exclude<TopicId, "all">].includes(scratchMetricId);
      if (!inTopic) { setScratchMetricId(null); setScratchBreakdown(null); setScratchShape(null); }
    }
  }

  function selectScratchMetric(id: string) {
    if (scratchMetricId === id) {
      setScratchMetricId(null); setScratchBreakdown(null); setScratchShape(null);
    } else {
      setScratchMetricId(id); setScratchBreakdown(null); setScratchShape(null);
    }
  }

  function selectScratchBreakdown(bd: BreakdownId) {
    setScratchBreakdown(bd);
    setScratchShape(defaultShape(bd));
  }

  const visibleScratchMetrics = useMemo(() => {
    let list = allMetrics;
    if (scratchSearch) {
      const q = scratchSearch.toLowerCase();
      return list.filter((m) =>
        m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
      );
    }
    if (scratchTopic !== "all") {
      const ids = TOPIC_METRICS[scratchTopic as Exclude<TopicId, "all">];
      list = list.filter((m) => ids.includes(m.id));
    }
    return list;
  }, [allMetrics, scratchTopic, scratchSearch]);

  const scratchSelectedMetric = scratchMetricId
    ? allMetrics.find((m) => m.id === scratchMetricId)
    : null;
  const scratchBreakdowns     = scratchSelectedMetric ? breakdownsFor(scratchSelectedMetric) : [];
  const scratchShapes         = scratchBreakdown ? shapesFor(scratchBreakdown) : [];
  const scratchResolvedLabel  = scratchSelectedMetric && scratchBreakdown && scratchShape
    ? scratchResolvedName(scratchSelectedMetric.label, scratchBreakdown, scratchShape)
    : null;

  function handleScratchAdd() {
    if (!scratchSelectedMetric || !scratchBreakdown || !scratchShape) return;
    const dimId = (scratchBreakdown !== "total" && scratchBreakdown !== "time")
      ? scratchBreakdown
      : undefined;
    onAdd({
      id:      `added-${scratchSelectedMetric.id}-${scratchBreakdown}-${scratchShape}-${Date.now()}`,
      title:   scratchResolvedLabel!,
      size:    scratchBreakdown === "sku" ? "lg" : "md",
      vizType: scratchShape,
      intent: {
        metricId:     scratchSelectedMetric.id,
        dimensionIds: dimId ? [dimId] : [],
        filters:      {},
        timeframe:    "trailing-13w",
        comparison:   "PvP",
      },
    });
    onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <div
        className="relative w-full bg-[var(--bg)] rounded-2xl shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden"
        style={{ maxWidth: 720, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--violet-500)] to-[var(--ciq-purple)] grid place-items-center text-white shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/>
              <rect x="14" y="11" width="7" height="10" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--ciq-purple)]">Add widget</div>
            <div className="text-[11px] text-[var(--fg-muted)]">Pick what you want to see — the rest is handled for you</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto h-8 w-8 grid place-items-center rounded-md border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)] transition"
            title="Close (Esc)"
          >×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] px-6 gap-1 shrink-0">
          {([
            { id: "build", label: "Build Widget" },
            { id: "ally",  label: "✦ Ask Ally"   },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-[12px] font-semibold border-b-2 transition -mb-px ${
                tab === t.id
                  ? "border-[var(--violet-600)] text-[var(--violet-700)]"
                  : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">

          {/* ── BUILD TAB ──────────────────────────────────────────────────────── */}
          {tab === "build" && buildView === "catalog" && (
            <>
              {/* Filter bar */}
              <div className="px-5 pt-4 pb-2 space-y-2 shrink-0 border-b border-[var(--border)]">
                {/* Topic pills */}
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_ORDER.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTopicFilter(t); setSelectedCardId(null); }}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition ${
                        topicFilter === t
                          ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                          : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--violet-400)] hover:text-[var(--fg)]"
                      }`}
                    >{t}</button>
                  ))}
                </div>

                {/* Moment chips — lighter row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mr-1">When:</span>
                  {MOMENTS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setMomentFilter(m.id); setSelectedCardId(null); }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                        momentFilter === m.id
                          ? "bg-[var(--violet-100)] border-[var(--violet-400)] text-[var(--violet-700)]"
                          : "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] hover:border-[var(--violet-300)] hover:text-[var(--fg)]"
                      }`}
                    >{m.label}</button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    value={catalogSearch}
                    onChange={(e) => { setCatalogSearch(e.target.value); setSelectedCardId(null); }}
                    placeholder="Search widgets…"
                    className="w-full h-8 pl-7 pr-7 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] outline-none focus:border-[var(--violet-400)] transition"
                  />
                  {catalogSearch && (
                    <button
                      onClick={() => setCatalogSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm leading-none"
                    >×</button>
                  )}
                </div>
              </div>

              {/* Card grid */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Start from scratch escape hatch */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--fg-muted)]">
                    {filteredCards.length} widget{filteredCards.length !== 1 ? "s" : ""}
                    {(topicFilter !== "All" || momentFilter !== "all" || catalogSearch) && " matching filters"}
                  </span>
                  <button
                    onClick={() => setBuildView("scratch")}
                    className="inline-flex items-center gap-1.5 text-[11px] text-[var(--violet-600)] hover:text-[var(--violet-700)] font-medium transition"
                    title="Build a custom widget from a metric"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Start from scratch
                  </button>
                </div>

                {filteredCards.length === 0 ? (
                  <div className="text-center text-[var(--fg-muted)] text-sm py-10">
                    No widgets match your filters.{" "}
                    <button
                      onClick={() => { setTopicFilter("All"); setMomentFilter("all"); setCatalogSearch(""); }}
                      className="text-[var(--violet-600)] underline"
                    >Clear filters</button>
                  </div>
                ) : topicFilter === "All" && !catalogSearch && momentFilter === "all" ? (
                  /* Grouped by topic when no filters */
                  TOPIC_ORDER.filter((t) => t !== "All").map((topic) => {
                    const topicCards = filteredCards.filter((c) => c.topic === topic);
                    if (topicCards.length === 0) return null;
                    return (
                      <div key={topic}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--fg-muted)]">
                            {topic}
                          </span>
                          <div className="flex-1 border-t border-[var(--border)]" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {topicCards.map((card) => (
                            <CardItem
                              key={card.id}
                              card={card}
                              selected={selectedCardId === card.id}
                              onSelect={() => setSelectedCardId(
                                selectedCardId === card.id ? null : card.id
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Flat grid when topic/moment/search filter is active */
                  <div className="grid grid-cols-2 gap-2">
                    {filteredCards.map((card) => (
                      <CardItem
                        key={card.id}
                        card={card}
                        selected={selectedCardId === card.id}
                        onSelect={() => setSelectedCardId(
                          selectedCardId === card.id ? null : card.id
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Catalog footer */}
              <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  {catalogFooterLabel ? (
                    <>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--fg-muted)] mb-0.5">Widget</div>
                      <div className="text-[13px] font-semibold text-[var(--ciq-purple)] truncate">{catalogFooterLabel}</div>
                    </>
                  ) : (
                    <div className="text-[12px] text-[var(--fg-muted)]">Pick a widget to add</div>
                  )}
                </div>
                <button
                  onClick={handleCatalogAdd}
                  disabled={!selectedCard}
                  className="btn btn-primary !py-2 !text-[12px] shrink-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Widget
                </button>
              </div>
            </>
          )}

          {/* ── SCRATCH BUILDER ─────────────────────────────────────────────────── */}
          {tab === "build" && buildView === "scratch" && (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Back to catalog */}
                <button
                  onClick={() => setBuildView("catalog")}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--violet-600)] hover:text-[var(--violet-700)] font-medium transition"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Back to catalog
                </button>

                {/* Step 1 — Topic */}
                <section>
                  <div className="label-xs mb-2">Topic</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SCRATCH_TOPICS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectScratchTopic(t.id)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition ${
                          scratchTopic === t.id && !scratchSearch
                            ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                            : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--violet-400)] hover:text-[var(--fg)]"
                        }`}
                      >{t.label}</button>
                    ))}
                  </div>
                </section>

                {/* Step 2 — Metric */}
                <section>
                  <div className="label-xs mb-2">Metric</div>
                  <div className="relative mb-3">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      value={scratchSearch}
                      onChange={(e) => setScratchSearch(e.target.value)}
                      placeholder="Search all metrics…"
                      className="w-full h-8 pl-7 pr-7 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] outline-none focus:border-[var(--violet-400)] transition"
                    />
                    {scratchSearch && (
                      <button
                        onClick={() => setScratchSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm leading-none"
                      >×</button>
                    )}
                  </div>
                  {visibleScratchMetrics.length === 0 ? (
                    <div className="text-center text-[var(--fg-muted)] text-sm py-6">No metrics match "{scratchSearch}"</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {visibleScratchMetrics.map((m) => {
                        const selected = scratchMetricId === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => selectScratchMetric(m.id)}
                            className={`text-left rounded-xl border px-3 py-2.5 transition ${
                              selected
                                ? "border-[var(--violet-500)] bg-[var(--violet-50)]"
                                : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--violet-300)] hover:bg-[var(--violet-50)]"
                            }`}
                          >
                            <div className={`text-[12px] font-semibold leading-snug ${selected ? "text-[var(--violet-700)]" : "text-[var(--fg)]"}`}>
                              {m.label}
                            </div>
                            {m.definition && (
                              <div className="text-[10px] text-[var(--fg-muted)] mt-0.5 line-clamp-1 leading-snug">
                                {m.definition}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Step 3a — Breakdown */}
                {scratchSelectedMetric && (
                  <section>
                    <div className="label-xs mb-2">Breakdown</div>
                    <div className="flex flex-wrap gap-1.5">
                      {scratchBreakdowns.map((bd) => (
                        <button
                          key={bd}
                          onClick={() => selectScratchBreakdown(bd)}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition ${
                            scratchBreakdown === bd
                              ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                              : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--violet-400)] hover:text-[var(--fg)]"
                          }`}
                        >{BREAKDOWN_LABELS[bd]}</button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Step 3b — Shape */}
                {scratchBreakdown && (
                  <section>
                    <div className="label-xs mb-2">Shape</div>
                    <div className="grid grid-cols-2 gap-2">
                      {scratchShapes.map((s) => {
                        const active = scratchShape === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setScratchShape(s)}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                              active
                                ? "border-[var(--violet-500)] bg-[var(--violet-50)]"
                                : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--violet-300)]"
                            }`}
                          >
                            <span className={`w-7 h-7 shrink-0 ${active ? "text-[var(--violet-600)]" : "text-[var(--fg-muted)]"}`}>
                              {SHAPE_ICONS[s]}
                            </span>
                            <span className={`text-[12px] font-medium ${active ? "text-[var(--violet-700)]" : "text-[var(--fg-muted)]"}`}>
                              {SHAPE_LABELS[s]}
                            </span>
                            {active && <span className="ml-auto text-[var(--violet-600)] text-sm shrink-0">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* Scratch footer */}
              <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  {scratchResolvedLabel ? (
                    <>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--fg-muted)] mb-0.5">Widget</div>
                      <div className="text-[13px] font-semibold text-[var(--ciq-purple)] truncate">{scratchResolvedLabel}</div>
                    </>
                  ) : (
                    <div className="text-[12px] text-[var(--fg-muted)]">
                      {!scratchSelectedMetric
                        ? "Select a topic, then a metric"
                        : !scratchBreakdown
                          ? "Choose a breakdown"
                          : "Choose a shape"}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleScratchAdd}
                  disabled={!scratchResolvedLabel}
                  className="btn btn-primary !py-2 !text-[12px] shrink-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Widget
                </button>
              </div>
            </>
          )}

          {/* ── ASK ALLY TAB ─────────────────────────────────────────────────── */}
          {tab === "ally" && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--violet-500)] to-[var(--ciq-purple)] grid place-items-center text-white shadow-md shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5zM19 14l.9 2.1 2.1.9-2.1.9L19 20l-.9-2.1-2.1-.9 2.1-.9L19 14z" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--ciq-purple)]">Create via Ask Ally</div>
                  <div className="text-[12px] text-[var(--fg-muted)]">Describe what you want — Ally generates a widget and pins it.</div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--violet-100)] bg-gradient-to-br from-[var(--violet-50)] to-white p-4 space-y-3">
                <div className="text-[12px] font-semibold text-[var(--ciq-purple)]">How it works</div>
                <ol className="space-y-2 text-[12px] text-[var(--fg)]">
                  {[
                    "Type your request in Ask Ally (e.g. \"Add a promo lift by SKU widget\")",
                    "Ally resolves the semantic intent and generates the widget configuration",
                    "Review the output, then click \"Save as new dashboard\" or pin it here",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[var(--violet-600)] text-white text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-2">
                <div className="label-xs mb-2">Try one of these prompts:</div>
                {[
                  "Add a promo lift by SKU widget",
                  "Show me organic SOV for my top 3 brands",
                  "Add a content score breakdown by category",
                  "Create an availability trend widget",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { onClose(); onOpenAlly?.(prompt); }}
                    className="w-full text-left rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-[12px] text-[var(--fg)] hover:border-[var(--violet-400)] hover:bg-[var(--violet-50)] transition flex items-center gap-2 group/prompt"
                  >
                    <svg className="text-[var(--violet-500)] shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5z" fill="currentColor"/>
                    </svg>
                    {prompt}
                    <svg className="ml-auto opacity-0 group-hover/prompt:opacity-100 transition text-[var(--violet-500)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ))}
              </div>

              <button
                onClick={() => { onClose(); onOpenAlly?.("Add a widget — "); }}
                className="btn btn-primary w-full !text-[13px] !py-2.5 flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5z" fill="currentColor"/>
                </svg>
                Open Ask Ally
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
