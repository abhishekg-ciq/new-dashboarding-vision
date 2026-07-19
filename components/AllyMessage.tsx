"use client";
import { useState } from "react";
import IntentResolution from "./IntentResolution";
import EvidenceCardView from "./EvidenceCard";
import { Chart } from "./MiniChart";
import { format, formatDelta } from "@/lib/semantic/compute";
import type { ComputeResult, SemanticIntent } from "@/lib/semantic/types";
import { getMetric } from "@/lib/semantic/registry";
import { useFeedback } from "@/lib/state/store";
import type { EvidenceCard } from "@/lib/rca/engine";

export type AllyAnswerWidget = {
  title: string;
  intent: SemanticIntent;
  result: ComputeResult;
};

export type AllyAnswer = {
  id: string;
  question: string;
  intent: SemanticIntent;
  intentLabel: string;
  result: ComputeResult;
  reply: string;
  proposedBranch?: string;
  frontierFlag?: boolean;
  source?: string;
  /** Full widget set for this answer — always present, length 1 for single-widget answers. */
  widgets?: AllyAnswerWidget[];
  /** RCA-engine evidence cards (diagnostic/prescriptive golden-set answers) — no widget to pin/save. */
  evidenceCards?: EvidenceCard[];
  /** Clarify-first (US-2 Gate 1) — render these instead of a widget. */
  clarifyQuestions?: string[];
  /** Guardrail refusal (e.g. cross-grain, INV-7) — explain instead of rendering. */
  guardrail?: { message: string; alternative: string };
  /** This answer's widgets share one grain and were generated as a from-blank dashboard preview. */
  dashboardDraft?: boolean;
};

function WidgetBlock({ w }: { w: AllyAnswerWidget }) {
  const m = getMetric(w.intent.metricId);
  const fmt = m?.format || "currency";
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <div className="text-xs uppercase tracking-wider text-[var(--ciq-ink-soft)]">{w.title}</div>
        <div className="text-xl font-semibold text-[var(--ciq-purple)]">{format(w.result.total, fmt)}</div>
        <div className={`text-sm font-medium ${w.result.comparisonDelta.pct < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {formatDelta(w.result.comparisonDelta.pct)} vs prior
        </div>
      </div>
      <Chart spec={w.result.chartSpec} rows={w.result.rows} />
    </div>
  );
}

export default function AllyMessage({
  answer,
  onPin,
  onSave,
  onSaveAsDashboard,
  onGoDeeper,
  onOpenAuthoring,
}: {
  answer: AllyAnswer;
  onPin?: () => void;
  onSave?: () => void;
  onSaveAsDashboard?: () => void;
  onGoDeeper?: () => void;
  /** Shown when `answer.dashboardDraft` is set (US-4 — FDE from-blank authoring). */
  onOpenAuthoring?: () => void;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const fb = useFeedback();
  const widgets = answer.widgets ?? [{ title: answer.intentLabel, intent: answer.intent, result: answer.result }];

  const feedbackRow = (
    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[var(--ciq-ink-soft)]">
      <button onClick={() => { setVote("up"); fb.vote(answer.id, "up"); }} className={`chip ${vote === "up" ? "border-[var(--ciq-accent)]" : ""}`} aria-label="thumbs up">👍</button>
      <button onClick={() => { setVote("down"); fb.vote(answer.id, "down"); }} className={`chip ${vote === "down" ? "border-[var(--ciq-accent)]" : ""}`} aria-label="thumbs down">👎</button>
      <span className="ml-auto">{answer.source === "live" ? "live · claude" : answer.source === "golden-set" ? "scripted · golden set" : answer.source === "scripted" ? "scripted fallback" : answer.source}</span>
    </div>
  );

  // Guardrail refusal — no widget, no pin/save; explain + alternative (US-2, INV-7).
  if (answer.guardrail) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-sm p-4 space-y-2 shadow-sm w-full">
        <div className="text-sm font-semibold text-amber-800">Can't render that as one dashboard</div>
        <div className="text-[13px] text-amber-900">{answer.guardrail.message}</div>
        <div className="text-[13px] text-amber-800"><strong>Alternative:</strong> {answer.guardrail.alternative}</div>
        {feedbackRow}
      </div>
    );
  }

  // Clarify-first — Gate 1: ask before rendering, never a silent empty state.
  if (answer.clarifyQuestions) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-2xl rounded-tl-sm p-4 space-y-2 shadow-sm w-full">
        <div className="text-sm text-[var(--fg)]">{answer.reply}</div>
        <ul className="list-disc pl-5 text-[13px] text-[var(--ciq-purple)] space-y-1">
          {answer.clarifyQuestions.map((q, i) => <li key={i}>{q}</li>)}
        </ul>
        <div className="text-[11px] text-[var(--fg-muted)]">Reply with the missing scope and Ally will render.</div>
        {feedbackRow}
      </div>
    );
  }

  // Diagnostic/prescriptive — RCA-engine evidence cards, nothing to pin/save.
  if (answer.evidenceCards) {
    return (
      <div className="space-y-3 w-full">
        {answer.evidenceCards.map((c) => <EvidenceCardView key={c.id} card={c} />)}
        <div className="bg-white border border-[var(--border)] rounded-2xl rounded-tl-sm p-4 space-y-2 shadow-sm">
          <div className="ally-claim">
            <div className="label-xs mb-1">Ally</div>
            {answer.reply}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onGoDeeper && <button className="btn btn-primary" onClick={onGoDeeper}>Go deeper →</button>}
          </div>
          {feedbackRow}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl rounded-tl-sm p-4 space-y-3 shadow-sm w-full">
      {widgets.length === 1 && <IntentResolution intent={widgets[0].intent} label={widgets[0].title} />}
      {answer.dashboardDraft && (
        <div className="text-[11px] font-medium text-[var(--violet-700)] bg-[var(--violet-50)] border border-[var(--violet-200)] rounded-md px-2.5 py-1.5">
          These {widgets.length} widgets share one grain — ready to save as a single dashboard.
        </div>
      )}

      <div className={widgets.length > 1 ? "grid md:grid-cols-2 gap-3" : "grid md:grid-cols-3 gap-3"}>
        <div className={widgets.length > 1 ? "md:col-span-2 grid md:grid-cols-2 gap-3" : "md:col-span-2"}>
          {widgets.map((w, i) => <WidgetBlock key={i} w={w} />)}
        </div>

        <div className="ally-claim space-y-2">
          <div className="label-xs">Ally</div>
          <div>{answer.reply}</div>
          {answer.proposedBranch && (
            <div className="text-[11px] text-[var(--ciq-cobalt)] font-medium">
              Proposed next branch → {answer.proposedBranch}
            </div>
          )}
          {answer.frontierFlag && (
            <div className="text-[11px] font-medium text-amber-700">⚠ Frontier hypothesis — outside the L0–L3 tree</div>
          )}
          {feedbackRow}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPin && <button className="btn btn-subtle" onClick={onPin}>📌 Pin to dashboard</button>}
        {answer.dashboardDraft && onOpenAuthoring ? (
          <button className="btn btn-primary" onClick={onOpenAuthoring}>⊞ Open in Dashboard Authoring</button>
        ) : (
          onSaveAsDashboard && (
            <button className="btn btn-subtle" onClick={onSaveAsDashboard}>
              ⊕ Save as new dashboard
            </button>
          )
        )}
        {onSave && <button className="btn btn-subtle" onClick={onSave}>💾 Save query</button>}
        {onGoDeeper && <button className="btn btn-primary" onClick={onGoDeeper}>Go deeper →</button>}
      </div>
    </div>
  );
}
