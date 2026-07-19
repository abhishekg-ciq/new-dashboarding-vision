"use client";
import type { SkillFile } from "@/lib/skills/types";
import type { ChartType, ComputeResult, SemanticIntent } from "@/lib/semantic/types";
import type { EvidenceCard } from "@/lib/rca/engine";

export type AllyApiWidget = {
  title: string;
  intent: SemanticIntent;
  result: ComputeResult;
  /** Explicit viz override, when the golden-set answer requested one (e.g. a viz-toggle command). */
  vizType?: ChartType;
};

export type AllyApiResponse = {
  reply: string;
  resolvedIntent: SemanticIntent;
  intentLabel: string;
  result: ComputeResult;
  proposedBranch?: string;
  frontierFlag?: boolean;
  source?: string;
  /** Present when the golden-set matcher fired. `widgets.length > 1` = a multi-widget answer. */
  widgets?: AllyApiWidget[];
  /** RCA-engine evidence cards, for diagnostic/prescriptive golden-set answers. */
  evidenceCards?: EvidenceCard[];
  /** Clarify-first: render these questions instead of a widget (US-2 Gate 1). */
  clarifyQuestions?: string[];
  /** Guardrail refusal: explain + suggest an alternative instead of rendering. */
  guardrail?: { message: string; alternative: string };
  /** Set on the golden-set "create a dashboard with N widgets" answer (row 19). */
  dashboardDraft?: boolean;
};

export async function askAlly(args: {
  question: string;
  clientId: string;
  skill?: SkillFile;
  frontierHypothesis?: string;
  /** The last rendered widget's intent, for "this widget" edit commands. */
  lastIntent?: SemanticIntent;
}): Promise<AllyApiResponse> {
  const r = await fetch("/api/ally", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`Ally route failed (${r.status})`);
  return (await r.json()) as AllyApiResponse;
}
