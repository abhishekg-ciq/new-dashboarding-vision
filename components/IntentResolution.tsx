"use client";
import type { SemanticIntent } from "@/lib/semantic/types";

export default function IntentResolution({ intent, label }: { intent: SemanticIntent; label: string }) {
  return (
    <div className="rounded-md border bg-[#faf9fb] p-2.5 text-[11px] text-[var(--ciq-ink-soft)]">
      <div className="label-xs mb-1.5">Ally · intent resolution</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
        <Field k="metric" v={intent.metricId} />
        <Field k="dimensions" v={intent.dimensionIds.join(", ") || "trend"} />
        <Field k="filters" v={Object.keys(intent.filters).length ? JSON.stringify(intent.filters) : "—"} />
        <Field k="timeframe" v={intent.timeframe} />
        <Field k="comparison" v={intent.comparison} />
      </div>
      <div className="mt-1.5 text-[10px] text-[var(--ciq-ink-soft)]">
        Resolved → <span className="font-semibold text-[var(--ciq-purple)]">{label}</span>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-white border rounded px-2 py-1">
      <div className="text-[10px] uppercase tracking-wider text-[#9a92a8]">{k}</div>
      <div className="text-[var(--ciq-purple)] font-medium truncate">{v}</div>
    </div>
  );
}
