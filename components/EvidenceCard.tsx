"use client";
import { BarBreakdown, WaterfallChart } from "./MiniChart";
import type { EvidenceCard as Evidence } from "@/lib/rca/engine";

const levelTag = (lvl: Evidence["level"]) => {
  if (lvl === "L0") return <span className="tag-l0">L0</span>;
  if (lvl === "L1") return <span className="tag-l1">L1</span>;
  if (lvl === "L2") return <span className="tag-l2">L2</span>;
  if (lvl === "L3") return <span className="tag-l3">L3</span>;
  return <span className="tag-frontier">FRONTIER</span>;
};

export default function EvidenceCard({
  card,
  onExpand,
  onPin,
}: {
  card: Evidence;
  onExpand?: (node: string) => void;
  onPin?: () => void;
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        {levelTag(card.level)}
        <div>
          <div className="text-sm font-semibold text-[var(--ciq-purple)]">{card.title}</div>
          {card.node && <div className="text-[11px] text-[var(--ciq-ink-soft)]">{card.node}</div>}
        </div>
        <div className="ml-auto text-[10px] text-[var(--ciq-ink-soft)] uppercase tracking-wider">{card.source}</div>
      </div>

      {card.chart?.type === "waterfall" && <WaterfallChart items={card.chart.series.map((s) => ({ label: s.label, value: s.value }))} />}
      {card.chart?.type === "bar" && (
        <BarBreakdown rows={card.chart.series.map((s) => ({ key: s.label, value: s.value }))} xKey="key" yKey="value" signed />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(card.facts).slice(0, 8).map(([k, v]) => (
          <div key={k} className="rounded-md border bg-[#faf9fb] p-2">
            <div className="text-[10px] uppercase tracking-wider text-[#9a92a8]">{k}</div>
            <div className="text-sm font-semibold text-[var(--ciq-purple)]">{typeof v === "number" ? v.toLocaleString() : v}</div>
          </div>
        ))}
      </div>

      <div className="ally-claim">
        <div className="label-xs mb-1">Ally · grounded narrative</div>
        {card.narrative}
      </div>

      {(card.expandsTo?.length || onPin) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {card.expandsTo?.map((n) => (
            <button key={n} onClick={() => onExpand?.(n)} className="chip">
              expand → {n.replace(/^L\d-?[A-Z]*:\s*/, "")}
            </button>
          ))}
          {onPin && <button onClick={onPin} className="chip ml-auto">📌 Pin to dashboard</button>}
        </div>
      )}
    </div>
  );
}
