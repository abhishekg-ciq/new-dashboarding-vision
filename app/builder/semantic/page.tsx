"use client";
import { useState } from "react";
import { semanticRegistry } from "@/lib/semantic/registry";
import { useClient, useGoldenQueries } from "@/lib/state/store";
/* eslint-disable @next/next/no-html-link-for-pages */

export default function SemanticContextPage() {
  const [client] = useClient();
  const golden = useGoldenQueries(client);
  const [contextNote, setContextNote] = useState("availability = sellable on-hand / total");

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ciq-purple)]">Semantic / Context layer</h1>
        <p className="text-sm text-[var(--ciq-ink-soft)]">
          Facts &amp; definitions. Metric definitions, dimensions, business context, the golden-query bank, and the metric → RCA mapping.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm font-semibold text-[var(--ciq-purple)]">Metric definitions ({semanticRegistry.metrics.length})</div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-[12px]">
            <thead className="bg-[#faf9fb] text-[var(--ciq-ink-soft)]">
              <tr>
                <th className="text-left px-3 py-2">Metric</th>
                <th className="text-left px-3 py-2">Backend</th>
                <th className="text-left px-3 py-2">Format</th>
                <th className="text-left px-3 py-2">RCA nodes</th>
                <th className="text-left px-3 py-2">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {semanticRegistry.metrics.map((m) => (
                <tr key={m.id} className="hover:bg-[#fbfaff]">
                  <td className="px-3 py-2"><div className="font-medium text-[var(--ciq-purple)]">{m.label}</div><div className="text-[10px] text-[var(--ciq-ink-soft)]">{m.id}</div></td>
                  <td className="px-3 py-2 text-[var(--ciq-ink-soft)]">{m.backendName}</td>
                  <td className="px-3 py-2">{m.format}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {m.rcaNodes.slice(0, 3).map((n) => <span key={n} className="chip text-[10px]">{n.replace(/^L\d-?[A-Z]*:\s*/, "")}</span>)}
                      {m.rcaNodes.length > 3 && <span className="text-[10px] text-[var(--ciq-ink-soft)]">+{m.rcaNodes.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-[var(--ciq-ink-soft)]">{m.alerts.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm font-semibold text-[var(--ciq-purple)]">Business context</div>
        <p className="text-xs text-[var(--ciq-ink-soft)]">
          Free-form definitions that pin shared meaning — analogous to “pipeline = open deals only”. Stored against the client.
        </p>
        <div className="flex gap-2">
          <input value={contextNote} onChange={(e) => setContextNote(e.target.value)} className="flex-1 h-9 px-2 rounded-md border bg-white text-sm" />
          <button className="btn btn-subtle">Add</button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm font-semibold text-[var(--ciq-purple)]">Golden-query bank · {client}</div>
        <p className="text-xs text-[var(--ciq-ink-soft)]">
          Saved questions from Chat. Mark <em>Reviewed</em> to make them canonical for this client.
        </p>
        {golden.list.length === 0 && <div className="text-sm text-[var(--ciq-ink-soft)]">No candidates yet. Save one from Chat.</div>}
        <div className="space-y-1.5">
          {golden.list.map((g) => (
            <div key={g.id} className="rounded-md border bg-[#faf9fb] p-2.5">
              <div className="flex items-start gap-2">
                <div>
                  <div className="text-sm text-[var(--ciq-purple)] font-medium">“{g.nl}”</div>
                  <div className="text-[11px] text-[var(--ciq-ink-soft)]">{g.intent.metricId} · {g.intent.comparison} · uses {g.uses}</div>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <button
                    className={`chip ${g.reviewed ? "border-[var(--ciq-accent)] text-[var(--ciq-purple)]" : ""}`}
                    onClick={() => golden.update(g.id, { reviewed: !g.reviewed, tags: g.reviewed ? ["candidate"] : ["reviewed"] })}
                  >
                    {g.reviewed ? "✓ Reviewed" : "Mark reviewed"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-2">
        <div className="text-sm font-semibold text-[var(--ciq-purple)]">Metric → RCA mapping editor</div>
        <div className="text-xs text-[var(--ciq-ink-soft)]">Editable keyword mapping that binds every metric to L0–L3 nodes + alert types. Read-only here; sourced from <code>lib/rca/mapping.ts</code>.</div>
      </div>
    </div>
  );
}
