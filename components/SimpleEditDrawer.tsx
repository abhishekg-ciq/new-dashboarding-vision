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

export default function SimpleEditDrawer({
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
  const allMetrics    = semanticRegistry.metrics;
  const allDimensions = semanticRegistry.dimensions;

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Metrics multi-select ──
  const selectedMetricIds: string[] = useMemo(() => {
    const primary = edit?.metricId ?? widget.intent.metricId;
    const added   = edit?.addedMetricIds ?? [];
    return [primary, ...added.filter((id) => id !== primary)];
  }, [edit?.metricId, edit?.addedMetricIds, widget.intent.metricId]);

  const [metricSearch, setMetricSearch] = useState("");
  const [metricOpen, setMetricOpen]     = useState(false);
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
      if (selectedMetricIds.length === 1) return;
      const next = selectedMetricIds.filter((m) => m !== id);
      onChange((prev) => ({ ...prev, metricId: next[0], addedMetricIds: next.slice(1) }));
    } else {
      const next = [...selectedMetricIds, id];
      onChange((prev) => ({ ...prev, metricId: next[0], addedMetricIds: next.slice(1) }));
    }
  }

  // ── Dimensions multi-select + reorder ──
  const [selectedDims, setSelectedDims] = useState<string[]>(
    edit?.dimensionIds ?? widget.intent.dimensionIds ?? []
  );
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

  const filteredMetrics = allMetrics.filter((m) =>
    m.label.toLowerCase().includes(metricSearch.toLowerCase())
  );
  const filteredDims = allDimensions.filter((d) =>
    d.label.toLowerCase().includes(dimSearch.toLowerCase())
  );

  const primaryMetric = allMetrics.find((m) => m.id === selectedMetricIds[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      {/* Modal — two-panel */}
      <div
        className="relative flex flex-col bg-[var(--bg)] rounded-2xl shadow-2xl border border-[var(--border)]"
        style={{ width: "min(96vw, 900px)", height: "min(92vh, 680px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="label-xs">Edit widget</p>
            <p className="text-sm font-semibold text-[var(--ciq-purple)] truncate mt-0.5">
              {edit?.title ?? widget.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="chip h-7 w-7 grid place-items-center text-[var(--fg-muted)] hover:text-[var(--fg)] shrink-0"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Body: two columns */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left: Config ─────────────────────────────────────────────── */}
          <div className="w-[400px] shrink-0 border-r border-[var(--border)] flex flex-col overflow-hidden">
            {/* Section header */}
            <div className="px-6 pt-5 pb-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[var(--violet-600)]">⚙</span>
                <span className="text-sm font-semibold text-[var(--fg)]">Widget configuration</span>
              </div>
              <p className="text-[12px] text-[var(--fg-muted)]">Select metrics and dimensions.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Metrics */}
          <section>
            <div className="label-xs mb-2">Metrics</div>
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
                        <span className="text-[9px] opacity-50 mr-0.5">PRIMARY</span>
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

              {metricOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl"
                  style={{ maxHeight: 240 }}
                >
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
                  <div className="overflow-y-auto" style={{ maxHeight: 190 }}>
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
              <p className="text-[11px] text-[var(--fg-muted)] mt-1.5">{primaryMetric.definition}</p>
            )}
          </section>

          {/* Dimensions */}
          <section>
            <div className="label-xs mb-2">Dimensions</div>
            <div ref={dimRef} className="relative">
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

              {dimOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl"
                  style={{ maxHeight: 220 }}
                >
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
                  <div className="overflow-y-auto" style={{ maxHeight: 170 }}>
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

            {/* Reorder */}
            {selectedDims.length > 1 && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] text-[var(--fg-muted)]">Order — first = primary breakdown</p>
                {selectedDims.map((id, idx) => {
                  const d = allDimensions.find((x) => x.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-muted)] text-sm"
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
          </section>

            </div>
          </div>

          {/* ── Right: Preview ───────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-muted)]">
            <div className="px-6 pt-5 pb-3 border-b border-[var(--border)] bg-[var(--bg)] shrink-0">
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
                  {selectedMetricIds.length} metric{selectedMetricIds.length > 1 ? "s" : ""}
                  {selectedDims.length > 0 && ` · ${selectedDims.length} dimension${selectedDims.length > 1 ? "s" : ""}`}
                </p>
                {selectedMetricIds.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {selectedMetricIds.map((id) => {
                      const m = allMetrics.find((x) => x.id === id);
                      return (
                        <span
                          key={id}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--violet-50)] text-[var(--violet-700)] border border-[var(--violet-200)]"
                        >
                          {m?.label ?? id}
                        </span>
                      );
                    })}
                  </div>
                )}
                {selectedDims.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {selectedDims.map((id) => {
                      const d = allDimensions.find((x) => x.id === id);
                      return (
                        <span
                          key={id}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--bg)] text-[var(--fg-muted)] border border-[var(--border)]"
                        >
                          by {d?.label ?? id}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>{/* end body */}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={onClose} className="btn btn-primary">Apply Changes</button>
        </div>
      </div>
    </div>
  );
}
