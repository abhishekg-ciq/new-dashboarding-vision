"use client";
import { useEffect, useState } from "react";
import { semanticRegistry } from "@/lib/semantic/registry";
import type { ExtraWidget } from "@/lib/dashboards/edits";

type Tab = "catalog" | "ally";

type CatalogWidget = {
  id: string;
  title: string;
  metricId: string;
  dimensionId?: string;
  size?: "sm" | "md" | "lg";
  vizType: "line" | "bar" | "table" | "kpi";
};

const CATALOG_TEMPLATES: {
  group: string;
  widgets: CatalogWidget[];
}[] = [
  {
    group: "Sales, Traffic & Conversion",
    widgets: [
      { id: "cat-rev-kpi", title: "Revenue", metricId: "shipped_revenue", vizType: "kpi" },
      { id: "cat-units-kpi", title: "Ordered Units", metricId: "ordered_units", vizType: "kpi" },
      { id: "cat-gv-kpi", title: "Glance Views", metricId: "glance_views", vizType: "kpi" },
      { id: "cat-conv-kpi", title: "Unit Conversion", metricId: "unit_conversion", vizType: "kpi" },
      { id: "cat-rev-trend", title: "Revenue Trend", metricId: "shipped_revenue", vizType: "line" },
      { id: "cat-gv-trend", title: "Glance Views Trend", metricId: "glance_views", vizType: "line" },
      { id: "cat-conv-trend", title: "Unit Conversion Trend", metricId: "unit_conversion", vizType: "line" },
      { id: "cat-rev-brand", title: "Revenue by Brand", metricId: "shipped_revenue", dimensionId: "brand", vizType: "bar" },
      { id: "cat-rev-cat", title: "Revenue by Category", metricId: "shipped_revenue", dimensionId: "category", vizType: "bar" },
      { id: "cat-rev-sku-tbl", title: "Revenue by SKU", metricId: "shipped_revenue", dimensionId: "sku", size: "lg", vizType: "table" },
      { id: "cat-rev-brand-tbl", title: "Revenue by Brand Table", metricId: "shipped_revenue", dimensionId: "brand", vizType: "table" },
    ],
  },
  {
    group: "Digital Shelf",
    widgets: [
      { id: "cat-avail-kpi", title: "Availability", metricId: "availability", vizType: "kpi" },
      { id: "cat-sov-kpi", title: "Organic SOV", metricId: "organic_sov", vizType: "kpi" },
      { id: "cat-content-kpi", title: "Content Score", metricId: "content_score", vizType: "kpi" },
      { id: "cat-avail-trend", title: "Availability % Trend", metricId: "availability", vizType: "line" },
      { id: "cat-sov-org", title: "Organic SOV by Brand", metricId: "organic_sov", dimensionId: "brand", vizType: "bar" },
      { id: "cat-sov-paid", title: "Paid SOV by Brand", metricId: "paid_sov", dimensionId: "brand", vizType: "bar" },
      { id: "cat-content-cat", title: "Content Score by Category", metricId: "content_score", dimensionId: "category", vizType: "bar" },
      { id: "cat-shelf-brand-tbl", title: "Digital Shelf by Brand", metricId: "organic_sov", dimensionId: "brand", vizType: "table" },
      { id: "cat-content-sku-tbl", title: "Content Score by SKU", metricId: "content_score", dimensionId: "sku", size: "lg", vizType: "table" },
    ],
  },
  {
    group: "Advertising",
    widgets: [
      { id: "cat-ad-spend-kpi", title: "Ad Spend", metricId: "ad_spend", vizType: "kpi" },
      { id: "cat-ad-sales-kpi", title: "Ad Sales", metricId: "ad_sales", vizType: "kpi" },
      { id: "cat-ad-spend-trend", title: "Ad Spend Trend", metricId: "ad_spend", vizType: "line" },
      { id: "cat-ad-sales-trend", title: "Ad Sales Trend", metricId: "ad_sales", vizType: "line" },
      { id: "cat-ad-cat", title: "Ad Spend by Category", metricId: "ad_spend", dimensionId: "category", vizType: "bar" },
      { id: "cat-ad-brand", title: "Ad Sales by Brand", metricId: "ad_sales", dimensionId: "brand", vizType: "bar" },
      { id: "cat-ad-brand-tbl", title: "Ad Performance by Brand", metricId: "ad_spend", dimensionId: "brand", vizType: "table" },
      { id: "cat-ad-cat-tbl", title: "Ad Spend by Category Table", metricId: "ad_spend", dimensionId: "category", vizType: "table" },
    ],
  },
];

function vizTypeLabel(vizType: CatalogWidget["vizType"]) {
  if (vizType === "kpi") return "Metric Card";
  if (vizType === "table") return "Table";
  return "Chart";
}

export default function AddWidgetModal({
  onAdd,
  onClose,
  onOpenAlly,
}: {
  onAdd: (widget: ExtraWidget) => void;
  onClose: () => void;
  onOpenAlly?: (prefill?: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("catalog");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function addCatalogWidget(tpl: CatalogWidget) {
    const id = `added-${tpl.id}-${Date.now()}`;
    onAdd({
      id,
      title: tpl.title,
      size: tpl.size ?? "md",
      vizType: tpl.vizType,
      intent: {
        metricId: tpl.metricId,
        dimensionIds: tpl.dimensionId ? [tpl.dimensionId] : [],
        filters: {},
        timeframe: "trailing-13w",
        comparison: "PvP",
      },
    });
    onClose();
  }

  const filteredCatalog = CATALOG_TEMPLATES.map((group) => ({
    ...group,
    widgets: group.widgets.filter((w) =>
      !search || w.title.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.widgets.length > 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-[var(--bg)] rounded-2xl shadow-2xl border border-[var(--border)] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--violet-500)] to-[var(--ciq-purple)] grid place-items-center text-white shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/>
              <rect x="14" y="11" width="7" height="10" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--ciq-purple)]">Add widget</div>
            <div className="text-[11px] text-[var(--fg-muted)]">Choose from the catalog or use Ask Ally</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto h-8 w-8 grid place-items-center rounded-md border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)] transition"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] px-6 gap-1">
          {([
            { id: "catalog", label: "Widget Catalog" },
            { id: "ally", label: "✦ Ask Ally" },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-[12px] font-semibold border-b-2 transition -mb-px ${
                tab === t.id
                  ? "border-[var(--violet-600)] text-[var(--violet-700)]"
                  : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">

          {/* CATALOG TAB */}
          {tab === "catalog" && (
            <div className="p-5 space-y-5">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search widgets…"
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] outline-none focus:border-[var(--violet-400)] transition"
                />
              </div>

              {filteredCatalog.length === 0 && (
                <div className="text-center text-[var(--fg-muted)] text-sm py-8">No widgets match "{search}"</div>
              )}

              {filteredCatalog.map((group) => (
                <div key={group.group}>
                  <div className="label-xs mb-2">{group.group}</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {group.widgets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => addCatalogWidget(w)}
                        className="text-left rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 hover:border-[var(--violet-400)] hover:bg-[var(--violet-50)] transition group/card"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-md bg-[var(--violet-100)] grid place-items-center text-[var(--violet-700)] shrink-0 mt-0.5">
                            <VizIcon vizType={w.vizType} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-[var(--ciq-purple)] group-hover/card:text-[var(--violet-800)]">{w.title}</div>
                            <div className="text-[10px] text-[var(--fg-muted)] mt-0.5 flex items-center gap-1">
                              <span>{semanticRegistry.metrics.find((m) => m.id === w.metricId)?.label ?? w.metricId}</span>
                              {w.dimensionId && <span>· by {w.dimensionId}</span>}
                              <span className="ml-auto rounded bg-[var(--bg-subtle)] border border-[var(--border)] px-1 py-px text-[9px] text-[var(--fg-muted)]">
                                {vizTypeLabel(w.vizType)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-auto opacity-0 group-hover/card:opacity-100 transition shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--violet-600)]" aria-hidden="true">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ASK ALLY TAB */}
          {tab === "ally" && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--violet-500)] to-[var(--ciq-purple)] grid place-items-center text-white shadow-md shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                    onClick={() => {
                      onClose();
                      onOpenAlly?.(prompt);
                    }}
                    className="w-full text-left rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-[12px] text-[var(--fg)] hover:border-[var(--violet-400)] hover:bg-[var(--violet-50)] transition flex items-center gap-2 group/prompt"
                  >
                    <svg className="text-[var(--violet-500)] shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5z" fill="currentColor"/>
                    </svg>
                    {prompt}
                    <svg className="ml-auto opacity-0 group-hover/prompt:opacity-100 transition text-[var(--violet-500)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenAlly?.("Add a widget — ");
                }}
                className="btn btn-primary w-full !text-[13px] !py-2.5 flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function VizIcon({ vizType }: { vizType: CatalogWidget["vizType"] }) {
  if (vizType === "kpi") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    );
  }
  if (vizType === "table") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
      </svg>
    );
  }
  if (vizType === "bar") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/>
      </svg>
    );
  }
  // line
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
