"use client";
import { useCallback, useEffect, useState } from "react";
import type { SemanticIntent } from "@/lib/semantic/types";

export type WidgetEdit = {
  title?: string;
  metricId?: string;
  /** Extra metrics overlaid on top of the primary metric (compute is done per-metric). */
  addedMetricIds?: string[];
  /** Dimension override. `null` means "no breakdown" (trend view). */
  dimensionId?: string | null;
  /** Multi-dimension override with ordering; supersedes dimensionId when present. */
  dimensionIds?: string[];
  showContribution?: boolean;
  showBenchmark?: boolean;
  vizType?: "line" | "bar" | "table" | "kpi";
  /** Sub-type for table: simple rows or breakdown drill-down. */
  tableSubType?: "simple" | "breakdown";
  removed?: boolean;
  insightContext?: string;
};

export type ExtraWidget = {
  id: string;
  title: string;
  intent: SemanticIntent;
  size?: "sm" | "md" | "lg";
  vizType?: "line" | "bar" | "table" | "kpi";
};

export type DashboardEdit = {
  /** dashboard-level title override */
  dashboardTitle?: string;
  /** widget-level overrides keyed by widget id */
  widgets: Record<string, WidgetEdit>;
  /** new widgets added to a (prebuilt or cloned) dashboard */
  addedWidgets?: ExtraWidget[];
};

const NS = "ally.v1";
const editsKey = (client: string, dashId: string) => `${NS}.dashedits.${client}.${dashId}`;

function read(client: string, dashId: string): DashboardEdit {
  if (typeof window === "undefined") return { widgets: {} };
  try {
    const v = window.localStorage.getItem(editsKey(client, dashId));
    return v ? (JSON.parse(v) as DashboardEdit) : { widgets: {} };
  } catch {
    return { widgets: {} };
  }
}

function write(client: string, dashId: string, value: DashboardEdit) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(editsKey(client, dashId), JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(`ally:dashedits.${client}.${dashId}`));
  } catch {}
}

function clear(client: string, dashId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(editsKey(client, dashId));
    window.dispatchEvent(new CustomEvent(`ally:dashedits.${client}.${dashId}`));
  } catch {}
}

/**
 * Saved edits + an in-memory draft. Draft mutates on each inline edit;
 * `save()` persists draft → localStorage; `discard()` reverts to saved.
 */
export function useDashboardDraft(client: string, dashId: string) {
  const [saved, setSaved] = useState<DashboardEdit>({ widgets: {} });
  const [draft, setDraft] = useState<DashboardEdit>({ widgets: {} });

  useEffect(() => {
    const s = read(client, dashId);
    setSaved(s);
    setDraft(s);
    const h = () => {
      const next = read(client, dashId);
      setSaved(next);
    };
    window.addEventListener(`ally:dashedits.${client}.${dashId}`, h);
    return () => window.removeEventListener(`ally:dashedits.${client}.${dashId}`, h);
  }, [client, dashId]);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  const save = useCallback(() => {
    write(client, dashId, draft);
    setSaved(draft);
  }, [client, dashId, draft]);

  const discard = useCallback(() => {
    setDraft(saved);
  }, [saved]);

  const reset = useCallback(() => {
    clear(client, dashId);
    setSaved({ widgets: {} });
    setDraft({ widgets: {} });
  }, [client, dashId]);

  const setWidget = useCallback((widgetId: string, patch: WidgetEdit | ((prev: WidgetEdit) => WidgetEdit)) => {
    setDraft((d) => {
      const prev = d.widgets[widgetId] || {};
      const next = typeof patch === "function" ? (patch as any)(prev) : { ...prev, ...patch };
      return { ...d, widgets: { ...d.widgets, [widgetId]: next } };
    });
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setDraft((d) => ({ ...d, widgets: { ...d.widgets, [widgetId]: { ...(d.widgets[widgetId] || {}), removed: true } } }));
  }, []);

  const restoreWidget = useCallback((widgetId: string) => {
    setDraft((d) => {
      const w = { ...(d.widgets[widgetId] || {}) };
      delete w.removed;
      return { ...d, widgets: { ...d.widgets, [widgetId]: w } };
    });
  }, []);

  const setDashboardTitle = useCallback((title: string) => {
    setDraft((d) => ({ ...d, dashboardTitle: title }));
  }, []);

  const addWidget = useCallback((w: ExtraWidget) => {
    setDraft((d) => {
      const widgetOverrides = w.vizType
        ? { ...d.widgets, [w.id]: { ...(d.widgets[w.id] || {}), vizType: w.vizType } }
        : d.widgets;
      return { ...d, addedWidgets: [...(d.addedWidgets || []), w], widgets: widgetOverrides };
    });
  }, []);

  const removeAddedWidget = useCallback((widgetId: string) => {
    setDraft((d) => ({ ...d, addedWidgets: (d.addedWidgets || []).filter((w) => w.id !== widgetId) }));
  }, []);

  return {
    draft,
    saved,
    dirty,
    save,
    discard,
    reset,
    setWidget,
    removeWidget,
    restoreWidget,
    setDashboardTitle,
    addWidget,
    removeAddedWidget,
  } as const;
}
