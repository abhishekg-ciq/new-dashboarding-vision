import type { PrebuiltWidget } from "@/lib/dashboards/prebuilt";
import type { WidgetEdit } from "@/lib/dashboards/edits";

/** Shared sessionStorage draft shape for the FDE blank-canvas authoring page (US-4). */
export const AUTHORING_DRAFT_KEY = "ally.authoring.draft";

export type AuthoringDraft = {
  name: string;
  widgets: PrebuiltWidget[];
  edits: Record<string, WidgetEdit>;
  /** Dimension ids in the dashboard's global filter bar. Auto-seeded from the grain (US-5),
   *  but the FDE may add non-conformed dims (SKU, sub-category, ...) as widget-scoped filters too. */
  globalDims: string[];
};

export const EMPTY_AUTHORING_DRAFT: AuthoringDraft = { name: "", widgets: [], edits: {}, globalDims: [] };

export function loadAuthoringDraft(): AuthoringDraft {
  if (typeof window === "undefined") return EMPTY_AUTHORING_DRAFT;
  try {
    const raw = sessionStorage.getItem(AUTHORING_DRAFT_KEY);
    return raw ? { ...EMPTY_AUTHORING_DRAFT, ...JSON.parse(raw) } : EMPTY_AUTHORING_DRAFT;
  } catch {
    return EMPTY_AUTHORING_DRAFT;
  }
}

export function seedAuthoringDraft(draft: AuthoringDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTHORING_DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}
