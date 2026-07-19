"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAlly } from "@/lib/ally/client";
import { getDimension, getMetric } from "@/lib/semantic/registry";
import { computeGrain, defaultGlobalDims, isGrainCompatible, supportedGlobalDims } from "@/lib/dashboards/grain";
import type { PrebuiltWidget } from "@/lib/dashboards/prebuilt";
import type { WidgetEdit } from "@/lib/dashboards/edits";
import { AUTHORING_DRAFT_KEY, EMPTY_AUTHORING_DRAFT, loadAuthoringDraft, type AuthoringDraft } from "@/lib/dashboards/authoringDraft";
import type { ChartType, SemanticIntent } from "@/lib/semantic/types";
import { useAuthoredDashboards, useClient, usePersona, useSkill } from "@/lib/state/store";
import Widget from "@/components/Widget";
import ChatInput from "@/components/ChatInput";

const CLIENTS = [
  { id: "new-balance", label: "New Balance" },
  { id: "nestle", label: "Nestlé" },
];

const DATE_PRESETS = ["Last 13 Weeks", "Last Month", "Last Quarter", "Year to Date"];

// Global filter set candidates. Brand/Category are conformed dims auto-seeded from the grain (US-5);
// the rest (SKU, sub-brand, sub-category, ...) aren't registered semantic dims yet — offered here as
// widget-scoped filter labels the FDE can pre-declare on the dashboard shell.
const GLOBAL_FILTER_DIM_OPTIONS = [
  { id: "brand", label: "Brand" },
  { id: "category", label: "Category" },
  { id: "sub_category", label: "Sub-category" },
  { id: "sub_brand", label: "Sub-brand" },
  { id: "sku", label: "SKU" },
  { id: "keyword", label: "Keyword" },
  { id: "channel", label: "Channel" },
  { id: "campaign", label: "Campaign" },
];

function globalDimLabel(id: string): string {
  return GLOBAL_FILTER_DIM_OPTIONS.find((o) => o.id === id)?.label ?? dimLabel(id);
}

type CanvasWidget = PrebuiltWidget;
type Draft = AuthoringDraft;
const EMPTY_DRAFT = EMPTY_AUTHORING_DRAFT;
const DRAFT_KEY = AUTHORING_DRAFT_KEY;

function narrowVizType(t: ChartType): PrebuiltWidget["vizType"] {
  return t === "line" || t === "bar" || t === "table" || t === "kpi" ? t : undefined;
}

const loadDraft = loadAuthoringDraft;

/** One chat turn: the FDE's request + Ally's explanation of what changed on the canvas — an IDE-style diff log. */
type Turn = {
  id: string;
  question: string;
  reply: string;
  addedWidgetIds: string[];
  decline?: { title: string; intent: SemanticIntent; vizType: PrebuiltWidget["vizType"] };
};

function dimLabel(id: string) {
  return getDimension(id)?.label ?? id;
}

function explainAdd(title: string, intent: SemanticIntent, isFirst: boolean, grainAfter: string | null): string {
  const m = getMetric(intent.metricId);
  const dimPart = intent.dimensionIds.length ? `split by ${intent.dimensionIds.map(dimLabel).join(", ")}` : "shown as a trend (no breakdown)";
  const scopePart = `${m?.label ?? intent.metricId}, ${dimPart}, ${intent.timeframe} vs ${intent.comparison}.`;
  if (isFirst) {
    return `Added "${title}" — ${scopePart} This is the first widget, so it establishes the dashboard's grain${grainAfter ? ` (${dimLabel(grainAfter)}-level)` : ""}.`;
  }
  return `Added "${title}" — ${scopePart} Same ${grainAfter ? `${dimLabel(grainAfter)}-level` : "existing"} grain as the rest of the canvas.`;
}

function explainDecline(title: string, grain: string | null): string {
  return `Didn't add "${title}" — it's not ${grain ? `${dimLabel(grain)}-level` : "the same grain as this dashboard"} data, so adding it would mix two entity types on one dashboard (INV-7).`;
}

function describeIntentShort(intent: SemanticIntent): string {
  const m = getMetric(intent.metricId);
  const dimPart = intent.dimensionIds.length ? `split by ${intent.dimensionIds.map(dimLabel).join(", ")}` : "shown as a trend";
  return `${m?.label ?? intent.metricId}, ${dimPart}`;
}

function explainEdit(title: string, prevIntent: SemanticIntent, nextIntent: SemanticIntent, addedMetricIds?: string[]): string {
  const changedMetric = prevIntent.metricId !== nextIntent.metricId;
  const changedDims = JSON.stringify(prevIntent.dimensionIds) !== JSON.stringify(nextIntent.dimensionIds);
  const bits: string[] = [];
  if (changedMetric || changedDims) bits.push(`now ${describeIntentShort(nextIntent)}`);
  if (addedMetricIds?.length) bits.push(`added ${addedMetricIds.map((id) => getMetric(id)?.label ?? id).join(", ")} as overlay metric(s)`);
  if (bits.length === 0) bits.push("visualization updated");
  return `Edited "${title}" — ${bits.join("; ")}.`;
}

export default function DashboardAuthoringPage() {
  const [persona] = usePersona();
  const [client] = useClient();
  const { skill } = useSkill(client);
  const router = useRouter();
  const authored = useAuthoredDashboards();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [dateRange, setDateRange] = useState(DATE_PRESETS[0]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Recover an interrupted authoring session (US-4 edge case). Chat transcript is not
  // persisted — the canvas (widgets/edits/filters) is the source of truth on reload.
  useEffect(() => {
    const d = loadDraft();
    setDraft(d);
    setHydrated(true);
    if (d.widgets.length > 0) {
      setTurns([{ id: "turn-seed", question: "(from Ask Ally)", reply: `Loaded ${d.widgets.length} widget(s) from chat: ${d.widgets.map((w) => `"${w.title}"`).join(", ")}.`, addedWidgetIds: d.widgets.map((w) => w.id) }]);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, loading]);

  const grain = useMemo(() => computeGrain(draft.widgets.map((w) => w.intent)), [draft.widgets]);

  // Dims in the global set that this grain's underlying data doesn't actually carry
  // (e.g. SKU picked while the dashboard is keyword-grain) — flagged rather than silently
  // left as a broken filter (US-5 acceptance).
  const supported = supportedGlobalDims(grain);
  const staleGlobalDims = grain ? draft.globalDims.filter((d) => !supported.includes(d)) : [];

  const jumpToWidget = (id: string) => {
    widgetRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 1500);
  };

  const selectedWidget = selectedId ? draft.widgets.find((w) => w.id === selectedId) ?? null : null;

  const editSelectedWidget = useCallback(
    async (question: string, target: CanvasWidget) => {
      const res = await askAlly({ question, clientId: client, skill, lastIntent: target.intent });
      const nextIntent = res.resolvedIntent;
      const first = res.widgets?.[0];
      const vizType = (first?.vizType ? narrowVizType(first.vizType) : undefined) ?? narrowVizType(res.result.chartSpec.type);
      // A golden-set "add metric" answer resolves to >1 widget — treat widgets[1:] as overlay metrics
      // on the selected widget rather than separate cards (mirrors how Widget.tsx renders addedMetricIds).
      const addedMetricIds = res.widgets && res.widgets.length > 1 ? res.widgets.slice(1).map((w) => w.intent.metricId) : undefined;

      setDraft((d) => ({
        ...d,
        widgets: d.widgets.map((w) => (w.id === target.id ? { ...w, title: res.intentLabel } : w)),
      }));
      setWidgetEdit(target.id, (prev) => ({
        ...prev,
        ...(nextIntent.metricId !== target.intent.metricId ? { metricId: nextIntent.metricId } : {}),
        ...(JSON.stringify(nextIntent.dimensionIds) !== JSON.stringify(target.intent.dimensionIds)
          ? { dimensionId: nextIntent.dimensionIds[0] ?? null }
          : {}),
        ...(vizType ? { vizType } : {}),
        ...(addedMetricIds ? { addedMetricIds } : {}),
        title: res.intentLabel,
      }));
      setTurns((t) => [...t, { id: `turn-${Date.now()}`, question, reply: explainEdit(target.title, target.intent, nextIntent, addedMetricIds), addedWidgetIds: [target.id] }]);
      setTimeout(() => jumpToWidget(target.id), 100);
    },
    [client, skill],
  );

  const addNewWidget = useCallback(
    async (question: string) => {
      const res = await askAlly({ question, clientId: client, skill });
      const intent = res.resolvedIntent;
      const vizType = narrowVizType(res.result.chartSpec.type);
      if (!isGrainCompatible(grain, intent)) {
        setTurns((t) => [...t, { id: `turn-${Date.now()}`, question, reply: explainDecline(res.intentLabel, grain), addedWidgetIds: [], decline: { title: res.intentLabel, intent, vizType } }]);
        return;
      }
      const widget: CanvasWidget = { id: `authored-w-${Date.now()}`, title: res.intentLabel, intent, vizType };
      const isFirst = draft.widgets.length === 0;
      const nextGrain = computeGrain([...draft.widgets, widget].map((w) => w.intent));
      setDraft((d) => ({
        ...d,
        widgets: [...d.widgets, widget],
        // Seed the global set from the very first widget; otherwise leave the FDE's choice alone.
        globalDims: d.widgets.length === 0 ? defaultGlobalDims(nextGrain) : d.globalDims,
      }));
      setTurns((t) => [...t, { id: `turn-${Date.now()}`, question, reply: explainAdd(res.intentLabel, intent, isFirst, nextGrain), addedWidgetIds: [widget.id] }]);
      setTimeout(() => jumpToWidget(widget.id), 100);
    },
    [client, skill, grain, draft.widgets],
  );

  const submitTurn = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setLoading(true);
      setError(null);
      try {
        if (selectedWidget) await editSelectedWidget(question, selectedWidget);
        else await addNewWidget(question);
        setQ("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [selectedWidget, editSelectedWidget, addNewWidget],
  );

  const startSeparateDashboard = (decline: NonNullable<Turn["decline"]>) => {
    setDraft({
      name: "",
      widgets: [{ id: `authored-w-${Date.now()}`, title: decline.title, intent: decline.intent, vizType: decline.vizType }],
      edits: {},
      globalDims: defaultGlobalDims(computeGrain([decline.intent])),
    });
    setTurns([]);
    setSelectedId(null);
  };

  const removeWidget = (id: string) => {
    setDraft((d) => {
      const widgets = d.widgets.filter((w) => w.id !== id);
      const { [id]: _drop, ...edits } = d.edits;
      return { ...d, widgets, edits };
    });
    setSelectedId((s) => (s === id ? null : s));
  };

  const move = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const i = d.widgets.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.widgets.length) return d;
      const widgets = [...d.widgets];
      [widgets[i], widgets[j]] = [widgets[j], widgets[i]];
      return { ...d, widgets };
    });
  };

  const setWidgetEdit = (id: string, patch: WidgetEdit | ((prev: WidgetEdit) => WidgetEdit)) => {
    setDraft((d) => {
      const prev = d.edits[id] || {};
      const next = typeof patch === "function" ? (patch as any)(prev) : { ...prev, ...patch };
      return { ...d, edits: { ...d.edits, [id]: next } };
    });
  };

  const narrowGlobalDims = () => {
    setDraft((d) => ({ ...d, globalDims: d.globalDims.filter((x) => !staleGlobalDims.includes(x)) }));
  };

  const clearCanvas = () => {
    if (draft.widgets.length > 0 && !confirm("Clear the canvas? This discards the current draft.")) return;
    setDraft(EMPTY_DRAFT);
    setTurns([]);
    setSelectedId(null);
  };

  const finishSave = (kind: "dashboard" | "template", targetClients: string[] | "all") => {
    authored.upsert({
      id: `authored-${Date.now()}`,
      name: draft.name.trim() || "Untitled dashboard",
      description: `Authored via chat · ${draft.widgets.length} widget(s)`,
      kind,
      widgets: draft.widgets.map((w) => ({ ...w, ...(draft.edits[w.id]?.vizType ? { vizType: draft.edits[w.id].vizType } : {}) })),
      globalFilterDims: draft.globalDims,
      targetClients,
      createdAt: Date.now(),
    });
    setDraft(EMPTY_DRAFT);
    setTurns([]);
    setSelectedId(null);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    setSaveOpen(false);
    router.push("/dashboards");
  };

  if (persona !== "fde") {
    return (
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <div className="card p-6 text-center space-y-2">
          <div className="text-sm font-semibold text-[var(--ciq-purple)]">FDE-only surface</div>
          <p className="text-sm text-[var(--ciq-ink-soft)]">
            Blank-canvas dashboard authoring requires resolving grain and defining global filters — decisions end users
            never make. Switch to the FDE persona (top-right) to use this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-white overflow-hidden">
      {/* ── Left: chat / diff surface ─────────────────────────────────────── */}
      <aside className="w-[26rem] max-w-[42vw] shrink-0 border-r border-[var(--border)] bg-[var(--bg-subtle)] flex flex-col">
        <div className="h-11 shrink-0 border-b border-[var(--border)] bg-white flex items-center px-4">
          <span className="text-sm font-semibold text-[var(--ciq-purple)]">Describe this dashboard</span>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-3">
          {turns.length === 0 && !loading && (
            <div className="text-center space-y-2 pt-10 px-3">
              <div className="text-sm font-semibold text-[var(--fg)]">Start describing widgets</div>
              <p className="text-[12px] text-[var(--fg-muted)]">
                e.g. "revenue trend", "top-10 SKUs by revenue", "channel mix by category". Each turn explains what
                changed on the canvas — add, edit, reorder, or remove before saving.
              </p>
            </div>
          )}

          {turns.map((t) => (
            <div key={t.id} className="space-y-1.5">
              <div className="bg-[var(--violet-50)] border border-[var(--violet-100)] rounded-lg rounded-tr-sm px-3 py-2 text-[13px] text-[var(--violet-900)] ml-6">
                {t.question}
              </div>
              <div className={`rounded-lg rounded-tl-sm px-3 py-2 text-[12.5px] mr-2 border ${t.decline ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-white border-[var(--border)] text-[var(--fg)]"}`}>
                {t.reply}
                {t.addedWidgetIds.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.addedWidgetIds.map((id) => {
                      const w = draft.widgets.find((x) => x.id === id);
                      if (!w) return null;
                      return (
                        <button key={id} onClick={() => jumpToWidget(id)} className="chip !text-[10px] hover:border-[var(--ciq-accent)]">
                          → {w.title}
                        </button>
                      );
                    })}
                  </div>
                )}
                {t.decline && (
                  <button
                    onClick={() => startSeparateDashboard(t.decline!)}
                    className="mt-1.5 btn btn-subtle !py-1 !text-[11px] whitespace-nowrap"
                  >
                    Start a separate dashboard
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="bg-white border border-[var(--border)] rounded-lg rounded-tl-sm px-3 py-2.5 mr-2 flex items-center gap-2 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-600)] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-600)] animate-bounce" style={{ animationDelay: "0.1s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-600)] animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-[var(--border)] bg-white p-2.5 pt-2 space-y-2">
          {selectedWidget && (
            <div className="flex items-center gap-1.5 text-[11px] bg-[var(--violet-50)] border border-[var(--violet-200)] text-[var(--violet-700)] rounded-md px-2 py-1">
              <span className="label-xs !text-[var(--violet-700)]">Editing</span>
              <span className="font-medium truncate">{selectedWidget.title}</span>
              <button onClick={() => setSelectedId(null)} className="ml-auto hover:text-[var(--violet-900)]" title="Clear context" aria-label="Clear context">
                ×
              </button>
            </div>
          )}
          <ChatInput
            value={q}
            onChange={setQ}
            onSubmit={submitTurn}
            loading={loading}
            placeholder={selectedWidget ? `Edit "${selectedWidget.title}"… (e.g. add ASP, break down by SKU, change to bar)` : "Describe a widget to add…"}
          />
        </div>
      </aside>

      {/* ── Right: canvas ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Toolbar */}
        <div className="shrink-0 border-b border-[var(--border)] p-3 px-4 flex items-center gap-3">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Untitled dashboard"
            className="text-sm font-semibold text-[var(--ciq-purple)] bg-transparent outline-none border-b border-transparent focus:border-[var(--violet-300)] min-w-[10rem]"
          />
          <span className="text-[11px] text-[var(--fg-muted)]">{draft.widgets.length} widget(s)</span>
          <span className="chip text-[10px]">
            Grain: {grain ? `${dimLabel(grain)}-level` : "not yet set"}
          </span>
          <button onClick={clearCanvas} className="ml-auto btn btn-ghost !py-1 !text-[12px]">
            Clear canvas
          </button>
          <button
            onClick={() => setSaveOpen(true)}
            disabled={draft.widgets.length === 0}
            className="btn btn-primary !py-1 !text-[12px] disabled:opacity-50"
            title={draft.widgets.length === 0 ? "Add at least one widget first" : "Publish this canvas"}
          >
            Publish…
          </button>
        </div>

        {/* Scaffold: date range + global filter set — always visible, even on a blank canvas (US-5) */}
        <div className="shrink-0 border-b border-[var(--border)] px-4 py-2.5 bg-[var(--bg-subtle)] space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="label-xs">Global filter set</span>
            <GlobalFilterDropdown selected={draft.globalDims} onChange={(dims) => setDraft((d) => ({ ...d, globalDims: dims }))} />
            {grain === null && (
              <span className="text-[11px] text-[var(--fg-muted)]">A sensible default auto-selects once the first widget establishes a grain.</span>
            )}
            <div className="relative ml-auto">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-7 rounded-md border border-[var(--border)] bg-white pl-2.5 pr-6 text-[12px] text-[var(--fg)] appearance-none cursor-pointer"
                title="Date range (demo — presets only)"
              >
                {DATE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {staleGlobalDims.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              <span>
                {staleGlobalDims.map(dimLabel).join(", ")} isn't available at this dashboard's {grain ? dimLabel(grain) : ""}-level grain —
                the global set is no longer universally applicable.
              </span>
              <button onClick={narrowGlobalDims} className="ml-auto chip bg-white">
                Narrow global set
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto scroll-thin p-4 md:p-6">
          {draft.widgets.length === 0 && (
            <div className="m-auto text-center max-w-md space-y-2 pt-16">
              <div className="text-sm font-semibold text-[var(--fg)]">No widgets yet</div>
              <p className="text-[13px] text-[var(--fg-muted)]">
                Describe what you want in the chat on the left — widgets will render here as you go.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            {draft.widgets.map((w, i) => {
              const edit: WidgetEdit | undefined = w.vizType
                ? { vizType: w.vizType, ...(draft.edits[w.id] || {}) }
                : draft.edits[w.id];
              return (
                <div
                  key={w.id}
                  ref={(el) => { widgetRefs.current[w.id] = el; }}
                  className={`relative group rounded-xl transition-shadow ${
                    selectedId === w.id
                      ? "ring-2 ring-[var(--violet-500)] ring-offset-2"
                      : highlightId === w.id
                      ? "ring-2 ring-[var(--ciq-accent)] ring-offset-2"
                      : ""
                  }`}
                >
                  <div className="absolute -top-2 -left-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => move(w.id, -1)}
                      disabled={i === 0}
                      className="h-6 w-6 grid place-items-center rounded-full border border-[var(--border)] bg-white text-[var(--fg-muted)] disabled:opacity-30 shadow-sm"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(w.id, 1)}
                      disabled={i === draft.widgets.length - 1}
                      className="h-6 w-6 grid place-items-center rounded-full border border-[var(--border)] bg-white text-[var(--fg-muted)] disabled:opacity-30 shadow-sm"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <div
                    className={`absolute -top-2 -right-2 z-10 transition ${
                      selectedId === w.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedId((s) => (s === w.id ? null : w.id))}
                      className={`h-6 px-2 rounded-full border text-[10px] font-medium shadow-sm flex items-center gap-1 ${
                        selectedId === w.id
                          ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                          : "bg-white border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--violet-400)] hover:text-[var(--violet-700)]"
                      }`}
                      title={selectedId === w.id ? "Stop editing via chat" : "Edit this widget via chat"}
                    >
                      {selectedId === w.id ? "✎ Editing" : "Use as context"}
                    </button>
                  </div>
                  <Widget
                    widgetId={w.id}
                    title={w.title}
                    intent={w.intent}
                    clientId={client}
                    size={w.size}
                    editable
                    edit={edit}
                    onEditChange={(patch) => setWidgetEdit(w.id, patch)}
                    onRemove={() => removeWidget(w.id)}
                    contextLabel="Authoring canvas"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {saveOpen && (
        <SaveModal
          defaultName={draft.name}
          onCancel={() => setSaveOpen(false)}
          onSave={finishSave}
        />
      )}
    </div>
  );
}

function GlobalFilterDropdown({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (dims: string[]) => void;
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

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const summary =
    selected.length === 0
      ? "None selected"
      : selected.length <= 2
      ? selected.map(globalDimLabel).join(", ")
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-7 inline-flex items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition ${
          selected.length > 0
            ? "border-[var(--violet-300)] bg-white text-[var(--violet-700)]"
            : "border-[var(--border)] bg-white text-[var(--fg-muted)] hover:bg-[var(--gray-50)]"
        }`}
        aria-expanded={open}
      >
        {summary}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 w-[200px] card p-1 text-[12px] shadow-md max-h-[280px] overflow-y-auto">
          {GLOBAL_FILTER_DIM_OPTIONS.map((opt) => (
            <label key={opt.id} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[var(--violet-50)] cursor-pointer">
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] shrink-0 ${
                selected.includes(opt.id) ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white" : "border-[var(--border)]"
              }`}>
                {selected.includes(opt.id) && "✓"}
              </span>
              <input type="checkbox" className="sr-only" checked={selected.includes(opt.id)} onChange={() => toggle(opt.id)} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SaveModal({
  defaultName,
  onCancel,
  onSave,
}: {
  defaultName: string;
  onCancel: () => void;
  onSave: (kind: "dashboard" | "template", targetClients: string[] | "all") => void;
}) {
  const [kind, setKind] = useState<"dashboard" | "template">("template");
  const [allClients, setAllClients] = useState(true);
  const [picked, setPicked] = useState<string[]>(CLIENTS.map((c) => c.id));

  const toggleClient = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} aria-hidden="true" />
      <div className="relative card w-full max-w-md p-5 space-y-4">
        <div>
          <div className="text-base font-semibold text-[var(--ciq-purple)]">Publish</div>
          <div className="text-[12px] text-[var(--fg-muted)]">"{defaultName.trim() || "Untitled dashboard"}"</div>
        </div>

        <div className="space-y-1.5">
          <div className="label-xs">Save as</div>
          <div className="flex gap-2">
            <button
              onClick={() => setKind("dashboard")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm text-left ${kind === "dashboard" ? "border-[var(--ciq-accent)] bg-[var(--violet-50)]" : "border-[var(--border)]"}`}
            >
              <div className="font-medium text-[var(--ciq-purple)]">Dashboard</div>
              <div className="text-[11px] text-[var(--fg-muted)]">Published directly, ready to use.</div>
            </button>
            <button
              onClick={() => setKind("template")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm text-left ${kind === "template" ? "border-[var(--ciq-accent)] bg-[var(--violet-50)]" : "border-[var(--border)]"}`}
            >
              <div className="font-medium text-[var(--ciq-purple)]">Template</div>
              <div className="text-[11px] text-[var(--fg-muted)]">End users instantiate their own copy.</div>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="label-xs">Publish to</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allClients} onChange={(e) => setAllClients(e.target.checked)} />
            All clients
          </label>
          {!allClients && (
            <div className="flex flex-col gap-1 pl-1">
              {CLIENTS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggleClient(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="btn btn-ghost !text-[13px]">
            Cancel
          </button>
          <button
            onClick={() => onSave(kind, allClients ? "all" : picked)}
            disabled={!allClients && picked.length === 0}
            className="btn btn-primary !text-[13px] disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
