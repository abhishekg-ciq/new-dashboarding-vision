"use client";
import { useState } from "react";
import IntentResolution from "./IntentResolution";
import { Chart } from "./MiniChart";
import { format, formatDelta } from "@/lib/semantic/compute";
import type { ComputeResult, SemanticIntent } from "@/lib/semantic/types";
import { getMetric } from "@/lib/semantic/registry";
import { useFeedback } from "@/lib/state/store";

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
};

export default function AllyMessage({
  answer,
  onPin,
  onSave,
  onSaveAsDashboard,
  onGoDeeper,
}: {
  answer: AllyAnswer;
  onPin?: () => void;
  onSave?: () => void;
  onSaveAsDashboard?: () => void;
  onGoDeeper?: () => void;
}) {
  const m = getMetric(answer.intent.metricId);
  const fmt = m?.format || "currency";
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const fb = useFeedback();

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl rounded-tl-sm p-4 space-y-3 shadow-sm w-full">
      <IntentResolution intent={answer.intent} label={answer.intentLabel} />

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-lg border bg-white p-3">
          <div className="flex items-baseline gap-3 mb-2">
            <div className="text-xs uppercase tracking-wider text-[var(--ciq-ink-soft)]">{m?.label}</div>
            <div className="text-2xl font-semibold text-[var(--ciq-purple)]">{format(answer.result.total, fmt)}</div>
            <div className={`text-sm font-medium ${answer.result.comparisonDelta.pct < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatDelta(answer.result.comparisonDelta.pct)} vs prior
            </div>
          </div>
          <Chart spec={answer.result.chartSpec} rows={answer.result.rows} />
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
          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[var(--ciq-ink-soft)]">
            <button
              onClick={() => { setVote("up"); fb.vote(answer.id, "up"); }}
              className={`chip ${vote === "up" ? "border-[var(--ciq-accent)]" : ""}`}
              aria-label="thumbs up"
            >👍</button>
            <button
              onClick={() => { setVote("down"); fb.vote(answer.id, "down"); }}
              className={`chip ${vote === "down" ? "border-[var(--ciq-accent)]" : ""}`}
              aria-label="thumbs down"
            >👎</button>
            <span className="ml-auto">{answer.source === "live" ? "live · claude" : answer.source === "scripted" ? "scripted fallback" : answer.source}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPin && <button className="btn btn-subtle" onClick={onPin}>📌 Pin to dashboard</button>}
        {onSaveAsDashboard && (
          <button className="btn btn-subtle" onClick={onSaveAsDashboard}>
            ⊕ Save as new dashboard
          </button>
        )}
        {onSave && <button className="btn btn-subtle" onClick={onSave}>💾 Save query</button>}
        {onGoDeeper && <button className="btn btn-primary" onClick={onGoDeeper}>Go deeper →</button>}
      </div>
    </div>
  );
}
