"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { semanticRegistry } from "@/lib/semantic/registry";
import type { SemanticIntent } from "@/lib/semantic/types";
import type { WidgetEdit } from "@/lib/dashboards/edits";

type WidgetLike = {
  id: string;
  title: string;
  intent: SemanticIntent;
};

// ─── Data sources ────────────────────────────────────────────────────────────
const DATA_SOURCES = [
  { id: "sales_1p",      label: "Sales Data (1P — Vendor Central)" },
  { id: "ad_data",       label: "Ad Spend Data (DSP / SP / SB)" },
  { id: "sov_data",      label: "Organic SOV Data" },
  { id: "paid_sov",      label: "Paid SOV Data" },
  { id: "content_data",  label: "Content & Digital Shelf" },
  { id: "inventory",     label: "Inventory & Availability" },
];

// ─── Viz catalogue ────────────────────────────────────────────────────────────
type VizId = "line" | "bar" | "table" | "kpi";

const VIZ_GROUPS: {
  label: string;
  items: { id: VizId; name: string; desc: string; icon: React.ReactNode }[];
}[] = [
  {
    label: "TIME SERIES",
    items: [
      {
        id: "line",
        name: "Line chart",
        desc: "Trends over time plotted as a continuous line.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3,17 8,10 13,14 21,5" />
          </svg>
        ),
      },
      {
        id: "bar",
        name: "Bar chart",
        desc: "Trends over time as vertical bars side-by-side.",
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="3"  y="10" width="4" height="12" rx="1" />
            <rect x="10" y="6"  width="4" height="16" rx="1" />
            <rect x="17" y="13" width="4" height="9"  rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "TOTAL VALUE",
    items: [
      {
        id: "kpi",
        name: "Number",
        desc: "A big number showing the total value.",
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <text x="3" y="18" fontSize="14" fontWeight="700" fontFamily="sans-serif">123</text>
          </svg>
        ),
      },
      {
        id: "table",
        name: "Table",
        desc: "Total values in a table view.",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <line x1="2"  y1="9"  x2="22" y2="9" />
            <line x1="2"  y1="15" x2="22" y2="15" />
            <line x1="9"  y1="3"  x2="9"  y2="21" />
            <line x1="15" y1="3"  x2="15" y2="21" />
          </svg>
        ),
      },
    ],
  },
];

const VIZ_FLAT = VIZ_GROUPS.flatMap((g) => g.items);

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdvancedEditDrawer({
  widget,
  edit,
  onChange,
  onClose,
}: {
  widget: WidgetLike;
  edit?: WidgetEdit;
  onChange: (patch: WidgetEdit | ((prev: WidgetEdit) => WidgetEdit)) => void;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const allMetrics    = semanticRegistry.metrics;
  const allDimensions = semanticRegistry.dimensions;

  // ── Title ──
  const [localTitle, setLocalTitle] = useState(edit?.title ?? widget.title);
  useEffect(() => setLocalTitle(edit?.title ?? widget.title), [edit?.title, widget.title]);

  // ── Viz ──
  const vizType = (edit?.vizType ?? (widget.intent.dimensionIds.length === 0 ? "line" : "bar")) as VizId;
  const [vizOpen, setVizOpen] = useState(false);
  const vizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vizOpen) return;
    const h = (e: MouseEvent) => {
      if (vizRef.current && !vizRef.current.contains(e.target as Node)) setVizOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [vizOpen]);

  const selectedViz = VIZ_FLAT.find((v) => v.id === vizType) ?? VIZ_FLAT[0];

  const tableSubType = edit?.tableSubType ?? "simple";

  // ── Metrics multi-select ──
  const selectedMetricIds: string[] = useMemo(() => {
    const primary = edit?.metricId ?? widget.intent.metricId;
    const added   = edit?.addedMetricIds ?? [];
    return [primary, ...added.filter((id) => id !== primary)];
  }, [edit?.metricId, edit?.addedMetricIds, widget.intent.metricId]);

  const [metricSearch, setMetricSearch]   = useState("");
  const [metricOpen, setMetricOpen]       = useState(false);
  const metricRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!metricOpen) return;
    const h = (e: MouseEvent) => {
      if (metricRef.current && !metricRef.current.contains(e.target as Node)) setMetricOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [metricOpen]);

  function toggleMetric(id: string) {
    const isSelected = selectedMetricIds.includes(id);
    if (isSelected) {
      if (selectedMetricIds.length === 1) return; // always keep at least 1
      const next = selectedMetricIds.filter((m) => m !== id);
      onChange((prev) => ({
        ...prev,
        metricId:      next[0],
        addedMetricIds: next.slice(1),
      }));
    } else {
      const next = [...selectedMetricIds, id];
      onChange((prev) => ({
        ...prev,
        metricId:      next[0],
        addedMetricIds: next.slice(1),
      }));
    }
  }

  // ── Dimensions multi-select + reorder ──
  const baseDims: string[] = edit?.dimensionIds
    ?? (widget.intent.dimensionIds.length > 0 ? widget.intent.dimensionIds : []);

  const [selectedDims, setSelectedDims] = useState<string[]>(baseDims);
  useEffect(() => {
    setSelectedDims(edit?.dimensionIds ?? widget.intent.dimensionIds ?? []);
  }, [edit?.dimensionIds, widget.intent.dimensionIds]);

  const [dimSearch, setDimSearch] = useState("");
  const [dimOpen, setDimOpen]     = useState(false);
  const dimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dimOpen) return;
    const h = (e: MouseEvent) => {
      if (dimRef.current && !dimRef.current.contains(e.target as Node)) setDimOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dimOpen]);

  function toggleDim(id: string) {
    const next = selectedDims.includes(id)
      ? selectedDims.filter((d) => d !== id)
      : [...selectedDims, id];
    setSelectedDims(next);
    onChange((prev) => ({ ...prev, dimensionIds: next, dimensionId: next[0] ?? null }));
  }

  function moveDim(idx: number, dir: -1 | 1) {
    const next = [...selectedDims];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSelectedDims(next);
    onChange((prev) => ({ ...prev, dimensionIds: next, dimensionId: next[0] ?? null }));
  }

  // ── Insight context ──
  const [localContext, setLocalContext] = useState(edit?.insightContext ?? "");
  useEffect(() => setLocalContext(edit?.insightContext ?? ""), [edit?.insightContext]);

  // ── Filtered lists ──
  const filteredMetrics = allMetrics.filter((m) =>
    m.label.toLowerCase().includes(metricSearch.toLowerCase())
  );
  const filteredDims = allDimensions.filter((d) =>
    d.label.toLowerCase().includes(dimSearch.toLowerCase())
  );

  // ── Current metric def ──
  const primaryMetric = allMetrics.find((m) => m.id === selectedMetricIds[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div
        className="relative flex flex-col bg-[var(--bg)] rounded-2xl shadow-2xl border border-[var(--border)]"
        style={{ width: "min(96vw, 1100px)", height: "min(92vh, 780px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-[var(--fg)]">Edit Widget</h2>
          <button
            onClick={onClose}
            className="chip h-7 w-7 grid place-items-center text-[var(--fg-muted)] hover:text-[var(--fg)]"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Warning */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-[12px] flex items-center gap-2 shrink-0">
          <span>⚠</span>
          <span>Changes will only apply to this dashboard. The original saved widget will not be modified.</span>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left: Config panel ─────────────────────────────────────────── */}
          <div className="w-[460px] shrink-0 border-r border-[var(--border)] overflow-y-auto">
            {/* Section header */}
            <div className="px-6 pt-5 pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[var(--violet-600)]">⚙</span>
                <span className="text-sm font-semibold text-[var(--fg)]">Widget configuration</span>
              </div>
              <p className="text-[12px] text-[var(--fg-muted)]">Configure visualization, metrics, and breakdown.</p>
            </div>

            <div className="px-6 py-5 space-y-6">

              {/* 1. Title */}
              <Field label="Title">
                <input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={() =>
                    onChange((prev) => {
                      const v = localTitle.trim();
                      if (!v || v === widget.title) {
                        const next = { ...prev }; delete next.title; return next;
                      }
                      return { ...prev, title: v };
                    })
                  }
                  className="input w-full"
                  placeholder="Widget title"
                />
              </Field>

              {/* 2. Data source */}
              <Field label="Data source">
                <select
                  defaultValue={primaryMetric?.backendName || "sales_1p"}
                  className="input w-full"
                >
                  {DATA_SOURCES.map((ds) => (
                    <option key={ds.id} value={ds.id}>{ds.label}</option>
                  ))}
                </select>
              </Field>

              {/* 3. Primary visualization (rich picker) */}
              <Field label="Visualization">
                <div ref={vizRef} className="relative">
                  <button
                    onClick={() => setVizOpen((v) => !v)}
                    className="input w-full flex items-center gap-3 text-left cursor-pointer"
                  >
                    <span className="w-5 h-5 text-[var(--violet-600)] shrink-0">
                      {selectedViz.icon}
                    </span>
                    <span className="flex-1 text-sm">{selectedViz.name}</span>
                    <span className="text-[var(--fg-muted)] text-[10px]">{vizOpen ? "▲" : "▼"}</span>
                  </button>

                  {vizOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl overflow-y-auto"
                         style={{ maxHeight: 320 }}>
                      {VIZ_GROUPS.map((group) => (
                        <div key={group.label}>
                          <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold tracking-widest text-[var(--fg-muted)] uppercase">
                            {group.label}
                          </div>
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                onChange((prev) => ({ ...prev, vizType: item.id }));
                                setVizOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--bg-muted)] ${
                                item.id === vizType
                                  ? "bg-[var(--violet-50)] text-[var(--violet-700)]"
                                  : "text-[var(--fg)]"
                              }`}
                            >
                              <span className="w-5 h-5 shrink-0 text-[var(--violet-600)]">{item.icon}</span>
                              <span className="flex-1">
                                <span className="text-sm font-medium block">{item.name}</span>
                                <span className="text-[11px] text-[var(--fg-muted)] block">{item.desc}</span>
                              </span>
                              {item.id === vizType && (
                                <span className="text-[var(--violet-600)] text-sm">✓</span>
                              )}
                            </button>
                          ))}
                          <div className="mx-4 border-b border-[var(--border)]" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              {/* 4. Sub type (only for table) */}
              {vizType === "table" && (
                <Field label="Table type">
                  <select
                    value={tableSubType}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        tableSubType: e.target.value as "simple" | "breakdown",
                      }))
                    }
                    className="input w-full"
                  >
                    <option value="simple">Simple table</option>
                    <option value="breakdown">Table with breakdown</option>
                  </select>
                  <p className="text-[11px] text-[var(--fg-muted)] mt-1">
                    {tableSubType === "breakdown"
                      ? "Table with optional breakdown drill-down."
                      : "Flat table without drill-down."}
                  </p>
                </Field>
              )}

              {/* 5. Metrics (multi-select) */}
              <Field label="Metrics">
                <div ref={metricRef} className="relative">
                  {/* Selected chips */}
                  <div
                    className="input w-full min-h-[38px] flex flex-wrap gap-1.5 cursor-pointer"
                    onClick={() => setMetricOpen((v) => !v)}
                  >
                    {selectedMetricIds.map((id, i) => {
                      const m = allMetrics.find((x) => x.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--violet-50)] text-[var(--violet-700)] border border-[var(--violet-200)]"
                        >
                          {i === 0 && (
                            <span className="text-[9px] opacity-60 mr-0.5">PRIMARY</span>
                          )}
                          {m?.label ?? id}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleMetric(id); }}
                            className="opacity-50 hover:opacity-100 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    <span className="text-[var(--fg-muted)] text-[11px] self-center ml-auto pr-1">
                      {metricOpen ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Dropdown */}
                  {metricOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl"
                         style={{ maxHeight: 260 }}>
                      <div className="p-2 border-b border-[var(--border)]">
                        <input
                          autoFocus
                          value={metricSearch}
                          onChange={(e) => setMetricSearch(e.target.value)}
                          placeholder="Search metrics…"
                          className="input w-full !py-1 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                        {filteredMetrics.map((m) => {
                          const isSelected = selectedMetricIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleMetric(m.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bg-muted)] transition ${
                                isSelected ? "text-[var(--violet-700)]" : "text-[var(--fg)]"
                              }`}
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                                isSelected
                                  ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                                  : "border-[var(--border)]"
                              }`}>
                                {isSelected && "✓"}
                              </span>
                              <span className="flex-1 truncate">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {primaryMetric?.definition && (
                  <p className="text-[11px] text-[var(--fg-muted)] mt-1">{primaryMetric.definition}</p>
                )}
              </Field>

              {/* 6. Dimensions (multi-select + reorder) */}
              <Field label="Dimensions">
                <div ref={dimRef} className="relative">
                  {/* Selected chips (ordered) */}
                  <div
                    className="input w-full min-h-[38px] flex flex-wrap gap-1.5 cursor-pointer"
                    onClick={() => setDimOpen((v) => !v)}
                  >
                    {selectedDims.length === 0 ? (
                      <span className="text-[var(--fg-muted)] text-sm">No dimensions — trend view</span>
                    ) : (
                      selectedDims.map((id) => {
                        const d = allDimensions.find((x) => x.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--violet-50)] text-[var(--violet-700)] border border-[var(--violet-200)]"
                          >
                            {d?.label ?? id}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleDim(id); }}
                              className="opacity-50 hover:opacity-100 ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    )}
                    <span className="text-[var(--fg-muted)] text-[11px] self-center ml-auto pr-1">
                      {dimOpen ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Dropdown */}
                  {dimOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl"
                         style={{ maxHeight: 240 }}>
                      <div className="p-2 border-b border-[var(--border)]">
                        <input
                          autoFocus
                          value={dimSearch}
                          onChange={(e) => setDimSearch(e.target.value)}
                          placeholder="Search dimensions…"
                          className="input w-full !py-1 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="overflow-y-auto" style={{ maxHeight: 180 }}>
                        {filteredDims.map((d) => {
                          const isSelected = selectedDims.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              onClick={() => toggleDim(d.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bg-muted)] transition ${
                                isSelected ? "text-[var(--violet-700)]" : "text-[var(--fg)]"
                              }`}
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                                isSelected
                                  ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                                  : "border-[var(--border)]"
                              }`}>
                                {isSelected && "✓"}
                              </span>
                              <span className="flex-1">{d.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order controls */}
                {selectedDims.length > 1 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] text-[var(--fg-muted)]">Drag order — first = primary breakdown</p>
                    {selectedDims.map((id, idx) => {
                      const d = allDimensions.find((x) => x.id === id);
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-[var(--bg-muted)] text-sm"
                        >
                          <span className="text-[var(--fg-muted)] text-[11px] w-4 text-center">{idx + 1}</span>
                          <span className="flex-1">{d?.label ?? id}</span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveDim(idx, -1)}
                              disabled={idx === 0}
                              className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-30 leading-none px-1"
                            >▲</button>
                            <button
                              onClick={() => moveDim(idx, 1)}
                              disabled={idx === selectedDims.length - 1}
                              className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-30 leading-none px-1"
                            >▼</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Field>

              {/* 7. % Contribution & Benchmark */}
              <Field label="% Contribution & Benchmark">
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center justify-between text-sm">
                    <span className="text-[var(--fg)]">Show % contribution</span>
                    <Toggle
                      checked={!!edit?.showContribution}
                      onChange={(v) => onChange((prev) => ({ ...prev, showContribution: v }))}
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm">
                    <span className="text-[var(--fg)]">Show benchmark / average</span>
                    <Toggle
                      checked={!!edit?.showBenchmark}
                      onChange={(v) => onChange((prev) => ({ ...prev, showBenchmark: v }))}
                    />
                  </label>
                </div>
              </Field>

              {/* 8. Insight context */}
              <Field label="Insight context">
                <textarea
                  value={localContext}
                  onChange={(e) => setLocalContext(e.target.value)}
                  onBlur={() =>
                    onChange((prev) => ({ ...prev, insightContext: localContext || undefined }))
                  }
                  placeholder="Add context for Ally — e.g. 'Focus on conversion, not traffic'"
                  className="input w-full resize-none"
                  rows={3}
                />
              </Field>

              {/* Reset */}
              <div className="pt-1 border-t border-[var(--border)]">
                <button
                  onClick={() => onChange(() => ({}))}
                  className="btn btn-ghost !py-1 !text-[12px]"
                >
                  Reset widget overrides
                </button>
              </div>

            </div>
          </div>

          {/* ── Right: Preview panel ──────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-muted)]">
            <div className="px-6 pt-5 pb-3 border-b border-[var(--border)] bg-[var(--bg)]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[var(--violet-600)]">👁</span>
                <span className="text-sm font-semibold text-[var(--fg)]">Preview</span>
              </div>
              <p className="text-[12px] text-[var(--fg-muted)]">Live preview of the widget.</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="text-3xl mb-3 opacity-30">📊</div>
                <p className="text-sm text-[var(--fg-muted)] font-medium">
                  {edit?.title ?? widget.title}
                </p>
                <p className="text-[11px] text-[var(--fg-muted)] mt-1">
                  {selectedViz.name} · {selectedMetricIds.length} metric{selectedMetricIds.length > 1 ? "s" : ""}
                  {selectedDims.length > 0 && ` · ${selectedDims.length} dimension${selectedDims.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 shrink-0 bg-[var(--bg)]">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={onClose} className="btn btn-primary">Apply Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-xs mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span className="toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="slider" />
    </span>
  );
}
