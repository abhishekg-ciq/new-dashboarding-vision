"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Widget from "@/components/Widget";
import AdvancedEditDrawer from "@/components/AdvancedEditDrawer";
import SimpleEditDrawer from "@/components/SimpleEditDrawer";
import InsightsCard from "@/components/InsightsCard";
import AddWidgetModal from "@/components/AddWidgetModal";
import FilterPanel, { type ActiveFilters } from "@/components/FilterPanel";
import { getPrebuilt } from "@/lib/dashboards/prebuilt";
import { useClient, useDashboards, usePersona, useSkill } from "@/lib/state/store";
import { useDashboardDraft, type WidgetEdit } from "@/lib/dashboards/edits";
import type { SemanticIntent, Comparison } from "@/lib/semantic/types";
import { getDataset } from "@/lib/data";

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const [client] = useClient();
  const { skill } = useSkill(client);
  const router = useRouter();
  const dashboards = useDashboards(client);
  const [persona] = usePersona();

  const prebuilt = getPrebuilt(client, params.id);
  const pinned = dashboards.list.find((d) => d.id === params.id);
  const dashboard = prebuilt || pinned;
  const isPersonal = !!pinned;

  const ds = getDataset(client);
  const brands = useMemo(() => Array.from(new Set(ds.skus.map((s) => s.brand))), [ds]);
  const categories = useMemo(() => Array.from(new Set(ds.skus.map((s) => s.category))), [ds]);

  const [dateRange, setDateRange] = useState<DateRangeState>({
    preset: "Last Month",
    start: "May 01, 2026",
    end: "May 31, 2026",
    compareTo: "Previous Period",
    compareStart: "Mar 31, 2026",
    compareEnd: "Apr 30, 2026",
  });
  // The compare-to selection drives the engine's comparison value.
  const comparison: Comparison =
    dateRange.compareTo === "Year Over Year"
      ? "YoY"
      : dateRange.compareTo === "None"
        ? skill.comparison
        : "PvP";
  const [globalFilters, setGlobalFilters] = useState<ActiveFilters>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [drillStack, setDrillStack] = useState<{ dim: string; value: string }[]>([]);

  const draftStore = useDashboardDraft(client, params.id);
  const [advancedTarget, setAdvancedTarget] = useState<string | null>(null);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  if (!dashboard) {
    return (
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="card p-6">
          <div className="text-lg font-semibold text-[var(--ciq-purple)]">Dashboard not found</div>
          <div className="text-sm text-[var(--ciq-ink-soft)]">
            This dashboard may exist for a different client. Try switching clients.
          </div>
        </div>
      </div>
    );
  }

  if (prebuilt && prebuilt.status === "stub") {
    return (
      <div className="px-6 py-6 max-w-5xl mx-auto space-y-3">
        <Header
          name={prebuilt.name}
          description={prebuilt.description}
          isPersonal={false}
        />
        <div className="card p-8 text-center">
          <div className="label-xs">Stub</div>
          <div className="text-base font-semibold text-[var(--ciq-purple)] mt-1">{prebuilt.name}</div>
          <div className="text-sm text-[var(--ciq-ink-soft)] mt-1">
            Stub placeholder per spec §6.5/§6.2. The shell is here; widgets are deferred.
          </div>
        </div>
      </div>
    );
  }

  // Merge widgets (base + addedWidgets), then apply per-widget edits / drilldown / global filters
  const baseWidgets = (dashboard as any).widgets || [];
  const extraWidgets = draftStore.draft.addedWidgets || [];

  // Special case: functional Promo dashboard has hardcoded widgets and no widget ids in PrebuiltWidget — synthesize them.
  const promoSynthetic: { id: string; title: string; intent: SemanticIntent; size?: "sm" | "md" | "lg" }[] =
    prebuilt && prebuilt.status === "functional" && prebuilt.id === "promo"
      ? [
          { id: "promo-cat", title: "Promo Rate by Category", intent: { metricId: "promo_rate", dimensionIds: ["category"], filters: {}, timeframe: "trailing-13w", comparison } },
          { id: "promo-brand", title: "Promo Rate by Brand", intent: { metricId: "promo_rate", dimensionIds: ["brand"], filters: {}, timeframe: "trailing-13w", comparison } },
          { id: "promo-rev", title: "Revenue trend (with promo overlay)", intent: { metricId: skill.primaryMetric, dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison }, size: "lg" },
        ]
      : [];

  const sourceWidgets = promoSynthetic.length > 0 ? promoSynthetic : baseWidgets;

  const resolvedTitle = draftStore.draft.dashboardTitle ?? dashboard.name;

  const widgets = [...sourceWidgets, ...extraWidgets]
    .filter((w: any) => !(draftStore.draft.widgets[w.id]?.removed))
    .map((w: any) => {
      const intent: SemanticIntent = {
        ...w.intent,
        comparison,
        filters: {
          ...(w.intent.filters || {}),
          ...Object.fromEntries(
            Object.entries(globalFilters)
              .filter(([, vals]) => vals.length > 0)
              .map(([k, vals]) => [k, vals[0]])
          ),
          ...Object.fromEntries(drillStack.map((d) => [d.dim, d.value])),
        },
        dimensionIds:
          drillStack.length > 0 && w.intent.dimensionIds.length
            ? [nextDim(w.intent.dimensionIds[0], skill.drillOrder, drillStack)]
            : w.intent.dimensionIds,
      };
      return { ...w, intent };
    });

  function handleExport(format: "ppt") {
    const label = format === "ppt" ? "PPT (branded, with AI narrative)" : format;
    setToast(`Export to ${label} — coming soon`);
  }

  const advancedWidget = widgets.find((w: any) => w.id === advancedTarget);

  function openAskAlly(seedOverride?: { question?: string; contextLabel?: string; prefill?: string }) {
    window.dispatchEvent(
      new CustomEvent("ally:open-dock", {
        detail: {
          contextLabel: seedOverride?.contextLabel ?? `Dashboard: ${resolvedTitle}`,
          question: seedOverride?.question,
          prefill: seedOverride?.prefill,
        },
      }),
    );
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-3">
      <Header
        name={resolvedTitle}
        description={(dashboard as any).description || "Custom dashboard."}
        isPersonal={isPersonal}
        editable={persona === "end-user"}
        onTitleChange={(t) => draftStore.setDashboardTitle(t)}
        onExportPpt={() => handleExport("ppt")}
        dirty={draftStore.dirty}
        onSave={draftStore.save}
        onDiscard={draftStore.discard}
        onAskAlly={() => openAskAlly()}
        onAddWidget={() => setAddWidgetOpen(true)}
      />

      <InsightsCard
        dashboardName={resolvedTitle}
        widgets={widgets.map((w: any) => ({ title: w.title, intent: w.intent }))}
        clientId={client}
        skill={skill}
      />

      <DashboardToolbar
        brands={brands}
        categories={categories}
        filters={globalFilters}
        setFilters={setGlobalFilters}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onOpenFilterPanel={() => setFilterPanelOpen(true)}
      />

      <FilterPanel
        open={filterPanelOpen}
        filters={globalFilters}
        onApply={setGlobalFilters}
        onClose={() => setFilterPanelOpen(false)}
      />

      {drillStack.length > 0 && (
        <div className="card p-2 px-3 text-xs flex items-center gap-2">
          <span className="label-xs">Drill:</span>
          {drillStack.map((d, i) => (
            <span key={i} className="chip">
              {d.dim} = {d.value}
            </span>
          ))}
          <button onClick={() => setDrillStack([])} className="ml-auto chip">
            Clear
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {widgets.map((w: any) => {
          const savedEdit = draftStore.draft.widgets[w.id];
          const widgetEdit: WidgetEdit | undefined = w.vizType
            ? { vizType: w.vizType, ...(savedEdit || {}) }
            : savedEdit;
          return (
            <Widget
              key={w.id}
              widgetId={w.id}
              title={w.title}
              intent={w.intent}
              clientId={client}
              anomalous={w.anomalous}
              size={w.size}
              editable={true}
              edit={widgetEdit}
              contextLabel={`Dashboard: ${resolvedTitle}`}
              onEditChange={(patch) => draftStore.setWidget(w.id, patch)}
              onAdvancedEdit={() => setAdvancedTarget(w.id)}
              onClone={() => {
                const cloneId = `${w.id}-clone-${Date.now()}`;
                draftStore.addWidget({
                  id: cloneId,
                  title: `${widgetEdit?.title ?? w.title} (copy)`,
                  intent: w.intent,
                  size: w.size,
                });
                setToast("Widget cloned");
              }}
              onInvestigate={() => {
                const id = `inv-${client}-${Date.now()}`;
                sessionStorage.setItem(
                  `ally:seed:${id}`,
                  JSON.stringify({
                    clientId: client,
                    metricId: w.intent.metricId,
                    fromQuestion: `Investigate ${w.title}`,
                  }),
                );
                router.push(`/workflows/rca/${id}`);
              }}
              onRemove={() => draftStore.removeWidget(w.id)}
            />
          );
        })}
      </div>

      {advancedWidget && persona === "end-user" && (
        <SimpleEditDrawer
          widget={advancedWidget}
          edit={draftStore.draft.widgets[advancedWidget.id]}
          onChange={(patch) => draftStore.setWidget(advancedWidget.id, patch)}
          onClose={() => setAdvancedTarget(null)}
        />
      )}

      {advancedWidget && (persona === "csm" || persona === "fde") && (
        <AdvancedEditDrawer
          widget={advancedWidget}
          edit={draftStore.draft.widgets[advancedWidget.id]}
          onChange={(patch) => draftStore.setWidget(advancedWidget.id, patch)}
          onClose={() => setAdvancedTarget(null)}
        />
      )}

      {addWidgetOpen && (
        <AddWidgetModal
          onAdd={(w) => { draftStore.addWidget(w); setToast("Widget added"); }}
          onClose={() => setAddWidgetOpen(false)}
          onOpenAlly={(prefill) => {
            openAskAlly({ prefill, contextLabel: `Dashboard: ${resolvedTitle}` });
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card px-4 py-2.5 text-sm shadow-md bg-[var(--ciq-purple)] text-white border-[var(--ciq-purple)] flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          {toast}
        </div>
      )}
    </div>
  );
}

function nextDim(current: string, drillOrder: string[], stack: { dim: string }[]) {
  const used = new Set([current, ...stack.map((s) => s.dim)]);
  return drillOrder.find((d) => !used.has(d)) || current;
}

function Header({
  name,
  description,
  isPersonal,
  editable,
  onTitleChange,
  onExportPpt,
  dirty,
  onSave,
  onDiscard,
  onAskAlly,
  onAddWidget,
}: {
  name: string;
  description: string;
  isPersonal: boolean;
  editable?: boolean;
  onTitleChange?: (t: string) => void;
  onExportPpt?: () => void;
  dirty?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  onAskAlly?: () => void;
  onAddWidget?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (onTitleChange && draft !== name) onTitleChange(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditing(false);
                if (onTitleChange && draft !== name) onTitleChange(draft);
              }
              if (e.key === "Escape") {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="text-2xl font-semibold text-[var(--ciq-purple)] bg-transparent border-b border-[var(--violet-400)] outline-none w-full"
            autoFocus
          />
        ) : (
          <button
            disabled={!editable}
            onClick={() => editable && setEditing(true)}
            className={`text-2xl font-semibold text-[var(--ciq-purple)] text-left ${
              editable ? "hover:bg-[var(--violet-50)] rounded px-1 -mx-1" : ""
            }`}
            title={editable ? "Click to rename" : undefined}
          >
            {name}
            {isPersonal && (
              <span className="ml-2 text-[10px] uppercase tracking-wider chip align-middle">Personal</span>
            )}
          </button>
        )}
        <div className="text-sm text-[var(--ciq-ink-soft)]">{description}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {dirty && (
          <>
            <span className="chip text-[11px] bg-amber-50 border-amber-300 text-amber-900">● Unsaved changes</span>
            <button onClick={onDiscard} className="btn btn-ghost !py-1 !text-[12px]">Discard</button>
            <button onClick={onSave} className="btn btn-primary !py-1 !text-[12px]">Save changes</button>
          </>
        )}
        {onAddWidget && (
          <button
            onClick={onAddWidget}
            className="h-8 inline-flex items-center gap-1.5 rounded-md border border-[var(--violet-300)] bg-[var(--bg)] px-3 text-[13px] font-medium text-[var(--violet-700)] hover:bg-[var(--violet-50)] transition"
            title="Add a widget to this dashboard"
            aria-label="Add widget"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add widget
          </button>
        )}
        {onAskAlly && (
          <button
            onClick={onAskAlly}
            className="h-8 inline-flex items-center gap-1.5 rounded-md border border-[var(--violet-300)] bg-[var(--bg)] px-3 text-[13px] font-medium text-[var(--violet-700)] hover:bg-[var(--violet-50)] transition"
            title="Open Ask Ally in the sidebar"
            aria-label="Ask Ally"
          >
            <HeaderSparkleIcon />
            Ask Ally
          </button>
        )}
        {onExportPpt && (
          <button
            onClick={onExportPpt}
            className="h-8 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-[13px] font-medium text-[var(--fg)] hover:bg-[var(--gray-50)] transition"
            title="Export as branded PPT with AI narrative"
            aria-label="Export PPT"
          >
            <PptIcon /> PPT
          </button>
        )}
      </div>
    </div>
  );
}

function DashboardToolbar({
  brands,
  categories,
  filters,
  setFilters,
  dateRange,
  setDateRange,
  onOpenFilterPanel,
}: {
  brands: string[];
  categories: string[];
  filters: ActiveFilters;
  setFilters: (f: ActiveFilters) => void;
  dateRange: DateRangeState;
  setDateRange: (r: DateRangeState) => void;
  onOpenFilterPanel: () => void;
}) {
  const totalActive = Object.values(filters).reduce((n, arr) => n + arr.length, 0);
  return (
    <div className="card p-2 px-3 flex flex-wrap items-center gap-2">
      <FilterChip
        label="Brand"
        values={filters.brand}
        options={brands}
        onChange={(v) => {
          const next = { ...filters };
          if (v == null) delete next.brand;
          else next.brand = v;
          setFilters(next);
        }}
      />
      <FilterChip
        label="Category"
        values={filters.category}
        options={categories}
        onChange={(v) => {
          const next = { ...filters };
          if (v == null) delete next.category;
          else next.category = v;
          setFilters(next);
        }}
      />

      <button
        onClick={onOpenFilterPanel}
        className={`relative h-7 w-7 grid place-items-center rounded-md border transition ${
          totalActive > 0
            ? "border-[var(--violet-400)] bg-[var(--violet-50)] text-[var(--violet-700)]"
            : "border-[var(--violet-300)] bg-[var(--bg)] text-[var(--violet-700)] hover:bg-[var(--violet-50)]"
        }`}
        title="Filters"
        aria-label="Filters"
      >
        <FilterFunnelIcon />
        {totalActive > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--violet-600)] text-white text-[8px] font-bold grid place-items-center">
            {totalActive}
          </span>
        )}
      </button>
      <div className="ml-auto">
        <DateRangeButton value={dateRange} onChange={setDateRange} />
      </div>
    </div>
  );
}

type DateRangeState = {
  preset: string;
  start: string;
  end: string;
  compareTo: string;
  compareStart: string;
  compareEnd: string;
};

function FilterChip({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[] | undefined;
  options: string[];
  onChange: (v: string[] | null) => void;
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
  const selected = values ?? [];
  const active = selected.length > 0;
  const displayLabel = selected.length === 1
    ? selected[0]
    : selected.length > 1
      ? `${selected[0]} +${selected.length - 1}`
      : null;

  function toggle(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter((x) => x !== opt)
      : [...selected, opt];
    onChange(next.length > 0 ? next : null);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-7 inline-flex items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition ${
          active
            ? "border-[var(--violet-400)] bg-[var(--violet-50)] text-[var(--violet-700)]"
            : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:bg-[var(--gray-50)]"
        }`}
        aria-expanded={open}
      >
        <span className="text-[var(--fg-muted)]">{label}</span>
        {displayLabel && <span className="font-medium">{displayLabel}</span>}
        {active && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            className="ml-0.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            aria-label={`Clear ${label}`}
          >
            ×
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 w-[200px] card p-1 text-[12px] shadow-md max-h-[260px] overflow-y-auto">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-[var(--violet-50)] ${
              !active ? "font-semibold text-[var(--violet-700)]" : ""
            }`}
          >
            All
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-[var(--violet-50)] flex items-center gap-2 ${
                selected.includes(opt) ? "font-semibold text-[var(--violet-700)]" : ""
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] shrink-0 ${
                selected.includes(opt)
                  ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                  : "border-[var(--border)]"
              }`}>
                {selected.includes(opt) && "✓"}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateRangeButton({
  value,
  onChange,
}: {
  value: DateRangeState;
  onChange: (v: DateRangeState) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DateRangeState>(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  function fmtRange(s: string, e: string) {
    return `${s} - ${e}`;
  }

  function applyPreset(preset: string): DateRangeState {
    // Simulate presets relative to a fixed "today" so the demo stays stable.
    const presets: Record<string, { start: string; end: string }> = {
      "Last Week": { start: "May 25, 2026", end: "May 31, 2026" },
      "Last Month": { start: "May 01, 2026", end: "May 31, 2026" },
      "Last 13 Weeks": { start: "Mar 02, 2026", end: "May 31, 2026" },
      "Last Quarter": { start: "Mar 01, 2026", end: "May 31, 2026" },
      "Year to Date": { start: "Jan 01, 2026", end: "May 31, 2026" },
    };
    const p = presets[preset] || { start: draft.start, end: draft.end };
    return { ...draft, preset, start: p.start, end: p.end };
  }

  function applyCompare(compareTo: string): DateRangeState {
    const compares: Record<string, { start: string; end: string }> = {
      "Previous Period": { start: "Mar 31, 2026", end: "Apr 30, 2026" },
      "Year Over Year": { start: "May 01, 2025", end: "May 31, 2025" },
      "None": { start: "", end: "" },
    };
    const c = compares[compareTo] || { start: draft.compareStart, end: draft.compareEnd };
    return { ...draft, compareTo, compareStart: c.start, compareEnd: c.end };
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-[12px] text-[var(--fg)] hover:bg-[var(--gray-50)] transition"
        aria-expanded={open}
        title="Pick date range"
      >
        <CalendarIcon />
        <span className="leading-tight text-left">
          <div className="font-medium">{fmtRange(value.start, value.end)}</div>
          {value.compareStart && value.compareEnd && (
            <div className="text-[10px] text-[var(--fg-muted)]">vs. {fmtRange(value.compareStart, value.compareEnd)}</div>
          )}
        </span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[420px] card p-3 shadow-md text-[12px] space-y-3">
          <div>
            <div className="text-[var(--violet-700)] font-semibold mb-1">Date Range</div>
            <select
              value={draft.preset}
              onChange={(e) => setDraft(applyPreset(e.target.value))}
              className="w-full h-8 rounded-md border bg-white px-2 text-[12px]"
            >
              {["Last Week", "Last Month", "Last 13 Weeks", "Last Quarter", "Year to Date", "Custom"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value, preset: "Custom" })}
                className="h-8 rounded-md border px-2 text-[12px]"
                aria-label="Start date"
              />
              <input
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value, preset: "Custom" })}
                className="h-8 rounded-md border px-2 text-[12px]"
                aria-label="End date"
              />
            </div>
          </div>
          <div>
            <div className="text-[var(--violet-700)] font-semibold mb-1">Compare to</div>
            <select
              value={draft.compareTo}
              onChange={(e) => setDraft(applyCompare(e.target.value))}
              className="w-full h-8 rounded-md border bg-white px-2 text-[12px]"
            >
              {["Previous Period", "Year Over Year", "None"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {draft.compareTo !== "None" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  value={draft.compareStart}
                  onChange={(e) => setDraft({ ...draft, compareStart: e.target.value })}
                  className="h-8 rounded-md border px-2 text-[12px]"
                  aria-label="Compare start"
                />
                <input
                  value={draft.compareEnd}
                  onChange={(e) => setDraft({ ...draft, compareEnd: e.target.value })}
                  className="h-8 rounded-md border px-2 text-[12px]"
                  aria-label="Compare end"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-[var(--fg-muted)]">
              Demo selector — wired to the dashboard's comparison.
            </span>
            <button
              onClick={() => {
                setDraft(value);
                setOpen(false);
              }}
              className="ml-auto btn btn-ghost !py-1 !text-[12px]"
            >
              Reset
            </button>
            <button
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="btn btn-primary !py-1 !text-[12px]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterFunnelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PptIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C231FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 8h6a2 2 0 0 1 0 4H8z" fill="#C231FF" stroke="none" />
      <path d="M12 18v2M9 20h6" />
    </svg>
  );
}

function HeaderSparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5zM19 14l.9 2.1 2.1.9-2.1.9L19 20l-.9-2.1-2.1-.9 2.1-.9L19 14zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8L2.5 17.5l1.8-.7L5 15z"
        fill="#C231FF"
      />
    </svg>
  );
}

