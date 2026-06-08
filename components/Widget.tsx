"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { compute, format, formatDelta } from "@/lib/semantic/compute";
import { getMetric, semanticRegistry } from "@/lib/semantic/registry";
import type { SemanticIntent } from "@/lib/semantic/types";
import type { WidgetEdit } from "@/lib/dashboards/edits";
import { BarBreakdown, TrendChart } from "./MiniChart";

export type WidgetProps = {
  widgetId?: string;
  title: string;
  intent: SemanticIntent;
  clientId: string;
  size?: "sm" | "md" | "lg";
  anomalous?: boolean;
  /** End-user inline edits: rename, +metric, swap dim, contribution/benchmark. */
  editable?: boolean;
  edit?: WidgetEdit;
  onEditChange?: (patch: WidgetEdit | ((prev: WidgetEdit) => WidgetEdit)) => void;
  onInvestigate?: () => void;
  onRemove?: () => void;
  onClone?: () => void;
  onAdvancedEdit?: () => void;
  /** Optional: surface name shown in the dock context label ("Dashboard: Multi-location Search"). */
  contextLabel?: string;
};

const DIMENSION_OPTIONS = [
  { id: "none", label: "No breakdown · trend" },
  { id: "brand", label: "Brand" },
  { id: "category", label: "Category" },
  { id: "sku", label: "SKU" },
];

function csvDownload(name: string, rows: any[]) {
  if (typeof window === "undefined" || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function applyEdit(intent: SemanticIntent, edit?: WidgetEdit): SemanticIntent {
  if (!edit) return intent;
  let dims = intent.dimensionIds;
  if (edit.dimensionId === null) dims = [];
  else if (typeof edit.dimensionId === "string") dims = [edit.dimensionId];
  return { ...intent, metricId: edit.metricId || intent.metricId, dimensionIds: dims };
}

function getTrendYKey(metricId: string): string {
  if (metricId.includes("revenue")) return "revenue";
  if (metricId.includes("units")) return "units";
  if (metricId.includes("glance_views") || metricId.includes("glanceViews") || metricId.includes("glance")) return "glanceViews";
  if (metricId === "unit_conversion" || metricId.includes("conversion")) return "conversion";
  return "revenue";
}

function TableBreakdown({
  rows,
  isBar,
  dimensionLabel,
  fmt = "currency",
}: {
  rows: any[];
  isBar: boolean;
  dimensionLabel: string;
  fmt: "currency" | "number" | "percent";
}) {
  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-lg w-full">
      <table className="min-w-full divide-y divide-[var(--border)] text-[11px] text-left">
        <thead className="bg-[var(--bg-subtle)] text-[var(--fg-muted)] uppercase tracking-wider text-[9px]">
          <tr>
            <th className="px-3 py-1.5 font-semibold">{isBar ? dimensionLabel : "Week"}</th>
            <th className="px-3 py-1.5 font-semibold text-right">Value</th>
            {isBar && <th className="px-3 py-1.5 font-semibold text-right">Prior</th>}
            {isBar && <th className="px-3 py-1.5 font-semibold text-right">Delta (%)</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--bg)]">
          {rows.map((r, i) => {
            const valueNow = isBar ? r.now : (r.revenue ?? r.units ?? r.glanceViews ?? r.conversion);
            const pct = isBar ? r.pct : 0;
            return (
              <tr key={i} className="hover:bg-[var(--gray-50)] transition">
                <td className="px-3 py-1.5 font-medium text-[var(--fg)]">{isBar ? String(r.key) : String(r.week)}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-[var(--ciq-purple)]">{format(valueNow, fmt)}</td>
                {isBar && <td className="px-3 py-1.5 text-right text-[var(--fg-muted)]">{format(r.prior, fmt)}</td>}
                {isBar && (
                  <td className={`px-3 py-1.5 text-right font-medium ${r.delta < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatDelta(pct / 100)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Widget({
  widgetId,
  title,
  intent,
  clientId,
  size = "md",
  anomalous,
  editable,
  edit,
  onEditChange,
  onInvestigate,
  onRemove,
  onClone,
  onAdvancedEdit,
  contextLabel,
}: WidgetProps) {
  const effectiveIntent = useMemo(() => applyEdit(intent, edit), [intent, edit]);
  const result = useMemo(() => compute(effectiveIntent, clientId), [effectiveIntent, clientId]);
  const metric = getMetric(effectiveIntent.metricId);
  const fmt = metric?.format || "currency";

  const addedMetrics = edit?.addedMetricIds || [];
  // Compute added metrics independently so we can render their totals + deltas.
  const addedResults = useMemo(
    () =>
      addedMetrics.map((id) => {
        const r = compute({ ...effectiveIntent, metricId: id, dimensionIds: [] }, clientId);
        return { id, result: r, metric: getMetric(id) };
      }),
    [addedMetrics, effectiveIntent, clientId],
  );

  const isTrend = effectiveIntent.dimensionIds.length === 0;
  const isBar = effectiveIntent.dimensionIds.length > 0;
  const activeVizType = edit?.vizType ?? (isTrend ? "line" : "bar");

  // Inline title editor
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(edit?.title ?? title);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTitleDraft(edit?.title ?? title);
  }, [edit?.title, title]);
  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  const displayedTitle = edit?.title ?? title;

  // Per-widget inline insight panel (Show/Hide Insights — matches Figma)
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

  function openAskAlly(question?: string, prefill?: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ally:open-dock", {
        detail: {
          contextLabel: contextLabel
            ? `${contextLabel} · ${displayedTitle}`
            : `Widget: ${displayedTitle}`,
          question,
          prefill,
        },
      }),
    );
  }

  // Bar enhancements: contribution + benchmark
  const totalNow = useMemo(() => {
    if (!isBar) return 0;
    return result.rows.reduce((a, r) => a + Number((r as any).now || 0), 0);
  }, [isBar, result.rows]);
  const benchmark = useMemo(() => {
    if (!isBar || result.rows.length === 0) return 0;
    return totalNow / result.rows.length;
  }, [isBar, totalNow, result.rows.length]);

  const barRowsWithExtras = useMemo(() => {
    if (!isBar) return result.rows;
    return result.rows.map((r) => ({
      ...r,
      pctOfTotal: totalNow > 0 ? Number((((r as any).now / totalNow) * 100).toFixed(1)) : 0,
    }));
  }, [isBar, result.rows, totalNow]);

  function commitTitle() {
    setEditingTitle(false);
    if (titleDraft && titleDraft !== title && onEditChange) {
      onEditChange((prev) => ({ ...prev, title: titleDraft }));
    }
    if (titleDraft === title && onEditChange) {
      onEditChange((prev) => {
        const next = { ...prev };
        delete next.title;
        return next;
      });
    }
  }

  return (
    <div className={`card p-4 flex flex-col gap-3 relative group/widget ${size === "lg" ? "col-span-2" : ""}`}>
      {/* Widget header row: title + action buttons */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleDraft(displayedTitle);
                  setEditingTitle(false);
                }
              }}
              className="text-sm font-semibold text-[var(--ciq-purple)] bg-transparent border-b border-[var(--violet-400)] outline-none w-full"
            />
          ) : (
            <button
              type="button"
              disabled={!editable}
              onClick={() => editable && setEditingTitle(true)}
              className={`text-sm font-semibold text-[var(--ciq-purple)] text-left leading-tight ${
                editable ? "hover:bg-[var(--violet-50)] rounded px-1 -mx-1" : ""
              }`}
              title={editable ? "Click to rename" : undefined}
            >
              {displayedTitle}
            </button>
          )}
        </div>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => openAskAlly(undefined, `About "${displayedTitle}" — `)}
            className="h-7 w-7 grid place-items-center rounded-md border border-[var(--violet-300)] bg-[var(--bg)] hover:bg-[var(--violet-50)] transition"
            title="Ask Ally about this widget"
            aria-label="Ask Ally about this widget"
          >
            <WidgetSparkleIcon />
          </button>
          <button
            className="h-7 w-7 grid place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)] transition"
            title="Filter"
            aria-label="Filter"
          >
            <WidgetFilterIcon />
          </button>
          <button
            onClick={() => csvDownload(displayedTitle, result.rows)}
            className="h-7 w-7 grid place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)] transition"
            title="Download CSV"
            aria-label="Download CSV"
          >
            <WidgetDownloadIcon />
          </button>
          {editable && (
            <ThreeDotMenu
              onEdit={onAdvancedEdit}
              onClone={onClone}
              onDelete={onRemove}
            />
          )}
        </div>
      </div>

      {/* Controls row — hidden in KPI mode */}
      {activeVizType !== "kpi" && (
        <div className="flex items-center gap-2 flex-wrap">
          <MetricSelector
            value={effectiveIntent.metricId}
            onChange={(v) => onEditChange?.((prev) => ({ ...prev, metricId: v }))}
          />

          {isBar && (
            <BreakdownSelector
              value={
                edit?.dimensionId === null
                  ? "none"
                  : (edit?.dimensionId ?? intent.dimensionIds[0] ?? "none")
              }
              onChange={(v) =>
                onEditChange?.((prev) => ({
                  ...prev,
                  dimensionId: v === "none" ? null : v,
                }))
              }
            />
          )}
          {isTrend && <RollupSelector />}
        </div>
      )}

      {/* Insights toggle — hidden in KPI mode */}
      {activeVizType !== "kpi" && (
        <>
          <button
            onClick={() => setInsightsOpen((v) => !v)}
            className={`-mt-1 w-full text-left rounded-md border px-3 py-2 text-[12px] font-semibold inline-flex items-center gap-1.5 transition ${
              insightsOpen
                ? "border-[var(--violet-300)] bg-[var(--violet-50)] text-[var(--violet-700)]"
                : "border-[var(--border)] bg-[var(--bg)] text-[var(--violet-700)] hover:bg-[var(--violet-50)]"
            }`}
            aria-expanded={insightsOpen}
            title={insightsOpen ? "Hide Ally insights for this widget" : "Show Ally insights for this widget"}
          >
            <WidgetSparkleIcon />
            {insightsOpen ? "Hide Insights" : "Show Insights"}
          </button>

          {insightsOpen && (
            <WidgetInsights
              title={displayedTitle}
              result={result}
              metricLabel={metric?.label}
              comparison={effectiveIntent.comparison}
              insightContext={edit?.insightContext}
              onAsk={(q) => openAskAlly(q)}
            />
          )}
        </>
      )}

      {/* KPI summary row — hidden in KPI mode (shown inline in the KPI card instead) */}
      {activeVizType !== "kpi" && (
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="text-2xl font-semibold text-[var(--ciq-purple)]">{format(result.total, fmt)}</div>
          <div className={`text-xs font-medium ${result.comparisonDelta.pct < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatDelta(result.comparisonDelta.pct)} vs {effectiveIntent.comparison === "vsPlan" ? "plan" : "prior"}
          </div>
          {addedResults.map(({ id, result: r, metric: m }) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px]"
            >
              <span className="text-[var(--fg-muted)]">{m?.label}</span>
              <span className="font-semibold text-[var(--ciq-purple)]">{format(r.total, m?.format || "number")}</span>
              <span className={r.comparisonDelta.pct < 0 ? "text-red-600" : "text-emerald-600"}>
                {formatDelta(r.comparisonDelta.pct)}
              </span>
              {editable && onEditChange && (
                <button
                  className="text-[var(--fg-muted)] hover:text-red-600"
                  onClick={() =>
                    onEditChange((prev) => ({
                      ...prev,
                      addedMetricIds: (prev.addedMetricIds || []).filter((x) => x !== id),
                    }))
                  }
                  title="Remove metric"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Chart / data rendering by vizType */}
      {activeVizType === "kpi" && (
        <div className="flex flex-col justify-between flex-1 pt-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-3xl font-bold text-[var(--ciq-purple)]">{format(result.total, fmt)}</span>
            <span className={`text-sm font-medium ${result.comparisonDelta.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {result.comparisonDelta.pct >= 0 ? "↑" : "↓"}{(Math.abs(result.comparisonDelta.pct) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="my-3 border-t border-[var(--border)]" />
          <div className="flex items-center gap-2 text-[12px] flex-wrap">
            <span className="text-[var(--fg-muted)]">
              vs {effectiveIntent.comparison === "vsPlan" ? "plan" : "prior"}
            </span>
            <span className="font-semibold text-[var(--fg)]">{format(result.prior, fmt)}</span>
            <span className={`font-medium ${result.comparisonDelta.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              ({formatDelta(result.comparisonDelta.pct)})
            </span>
          </div>
        </div>
      )}

      {activeVizType === "table" && (
        <TableBreakdown
          rows={isBar ? barRowsWithExtras : result.rows}
          isBar={isBar}
          dimensionLabel={effectiveIntent.dimensionIds[0] ?? "Dimension"}
          fmt={fmt as "currency" | "number" | "percent"}
        />
      )}

      {activeVizType === "line" && isTrend && (
        <TrendChart rows={result.rows} yKey={getTrendYKey(effectiveIntent.metricId)} refKey={edit?.showBenchmark ? "plan" : "plan"} />
      )}

      {activeVizType === "bar" && isBar && (
        <div>
          <BarBreakdown rows={barRowsWithExtras} xKey="key" yKey="now" />
          {edit?.showBenchmark && (
            <div className="mt-1 text-[11px] text-[var(--fg-muted)]">
              Benchmark (avg): <span className="font-semibold text-[var(--ciq-purple)]">{format(benchmark, fmt)}</span>
            </div>
          )}
          {edit?.showContribution && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="label-xs">% of total:</span>
              {barRowsWithExtras.slice(0, 6).map((r: any) => (
                <span key={String(r.key)} className="chip text-[10px]">
                  {String(r.key)} · {r.pctOfTotal}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fallback: if isTrend but vizType is bar, or isBar but vizType is line */}
      {activeVizType === "bar" && isTrend && (
        <TrendChart rows={result.rows} yKey={getTrendYKey(effectiveIntent.metricId)} />
      )}
      {activeVizType === "line" && isBar && (
        <BarBreakdown rows={barRowsWithExtras} xKey="key" yKey="now" />
      )}

    </div>
  );
}

function ThreeDotMenu({
  onEdit,
  onClone,
  onDelete,
}: {
  onEdit?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-7 grid place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)] transition"
        title="More options"
        aria-label="More options"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <ThreeDotsIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-[140px] card p-1 text-[12px] shadow-md">
          {onEdit && (
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[var(--violet-50)] flex items-center gap-2 text-[var(--fg)]"
            >
              <PencilIcon /> Edit
            </button>
          )}
          {onClone && (
            <button
              onClick={() => { onClone(); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[var(--violet-50)] flex items-center gap-2 text-[var(--fg)]"
            >
              <CloneWidgetIcon /> Clone
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-red-50 flex items-center gap-2 text-red-600"
            >
              <TrashWidgetIcon /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MetricSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[12px]">
      <span className="text-[var(--fg-muted)]">Metric:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[var(--violet-700)] font-medium outline-none"
        aria-label="Metric"
      >
        {semanticRegistry.metrics.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BreakdownSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const current = DIMENSION_OPTIONS.find((d) => d.id === value) || DIMENSION_OPTIONS[0];
  return (
    <label className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[12px]">
      <span className="text-[var(--fg-muted)]">Breakdown:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[var(--violet-700)] font-medium outline-none"
        aria-label="Breakdown"
      >
        {DIMENSION_OPTIONS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label.replace(/·.*$/, "").trim()}
          </option>
        ))}
      </select>
    </label>
  );
}

function RollupSelector() {
  const [rollup, setRollup] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  return (
    <label className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[12px]">
      <RollupIcon />
      <select
        value={rollup}
        onChange={(e) => setRollup(e.target.value as "Daily" | "Weekly" | "Monthly")}
        className="bg-transparent text-[var(--fg)] font-medium outline-none"
        aria-label="Rollup"
      >
        <option>Daily</option>
        <option>Weekly</option>
        <option>Monthly</option>
      </select>
    </label>
  );
}

function WidgetDownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function WidgetFilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function RollupIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="9" y2="18" />
    </svg>
  );
}

function WidgetSparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5zM19 14l.9 2.1 2.1.9-2.1.9L19 20l-.9-2.1-2.1-.9 2.1-.9L19 14zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8L2.5 17.5l1.8-.7L5 15z"
        fill="#C231FF"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function CloneWidgetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function TrashWidgetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ThreeDotsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function WidgetInsights({
  title,
  result,
  metricLabel,
  comparison,
  insightContext,
  onAsk,
}: {
  title: string;
  result: { total: number; comparisonDelta: { pct: number }; rows: any[] };
  metricLabel?: string;
  comparison: string;
  insightContext?: string;
  onAsk: (q: string) => void;
}) {
  const pct = result.comparisonDelta.pct;
  const direction = pct < 0 ? "below" : "above";
  const baseline = comparison === "vsPlan" ? "plan" : "prior";
  const magnitude = Math.abs(pct * 100).toFixed(1);
  const meaningful = Math.abs(pct) >= 0.02;

  // Top contributor (if a breakdown is present)
  const sortedRows = [...(result.rows || [])]
    .filter((r) => r && typeof (r as any).now === "number")
    .sort((a: any, b: any) => (b.now || 0) - (a.now || 0));
  const topRow = sortedRows[0] as any | undefined;

  const followUps: string[] = [];
  if (meaningful) {
    followUps.push(
      `Why is ${metricLabel || title} ${magnitude}% ${direction} ${baseline}?`,
    );
  }
  if (topRow?.key) {
    followUps.push(`Show ${metricLabel || title} for ${topRow.key} over the last 13 weeks`);
  }
  followUps.push(`What should I do next about ${metricLabel || title}?`);

  return (
    <div className="rounded-lg border border-[var(--violet-200)] bg-gradient-to-br from-[var(--violet-50)] to-white p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[var(--violet-600)] grid place-items-center text-white text-[10px] font-bold">A</div>
        <div className="text-[12px] font-semibold text-[var(--ciq-purple)]">Ally insights · {title}</div>
      </div>
      <ul className="space-y-1 text-[12px]">
        {meaningful ? (
          <li className="text-[var(--fg)]">
            <span className="font-medium text-[var(--ciq-purple)]">{metricLabel || title}</span>{" "}
            is <span className={pct < 0 ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {magnitude}% {direction}
            </span>{" "}
            {baseline} for this period.
          </li>
        ) : (
          <li className="text-[var(--fg-muted)]">
            {metricLabel || title} is roughly in line with {baseline} ({magnitude}% delta).
          </li>
        )}
        {topRow?.key && (
          <li className="text-[var(--fg)]">
            Top contributor:{" "}
            <span className="font-medium text-[var(--ciq-purple)]">{String(topRow.key)}</span>
            {" "}— investigate first.
          </li>
        )}
      </ul>
      <div className="pt-1 flex flex-wrap gap-1.5">
        {followUps.slice(0, 3).map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            className="chip text-[11px] hover:border-[var(--violet-400)] hover:text-[var(--violet-700)]"
            title="Open Ask Ally with this question"
          >
            <WidgetSparkleIcon /> {q}
          </button>
        ))}
      </div>

      {insightContext && (
        <div className="pt-2 border-t border-[var(--violet-100)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] mb-0.5">Context</div>
          <div className="text-[11px] text-[var(--fg)]">{insightContext}</div>
        </div>
      )}
    </div>
  );
}
