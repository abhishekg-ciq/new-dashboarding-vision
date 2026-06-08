"use client";
import { useRouter } from "next/navigation";
import { useClient, useDashboards, useInvestigations } from "@/lib/state/store";

export default function RecommendationsPage() {
  const [client] = useClient();
  const investigations = useInvestigations(client);
  const dashboards = useDashboards(client);
  const router = useRouter();
  const recs = investigations.list.filter((i) => i.recommendation);

  const pin = (inv: any) => {
    const id = `db-${client}-pins`;
    const existing = dashboards.list.find((d) => d.id === id) || {
      id, clientId: client, name: "Pinned from Chat", widgets: [], prebuilt: false,
    };
    existing.widgets.push({
      id: `w-rec-${Date.now()}`,
      title: `Recommendation: ${inv.recommendation.title}`,
      intent: { metricId: inv.metricId, dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: inv.skillSnapshot?.comparison || "YoY" },
      chartType: "line",
      size: "md",
      source: "workflow",
    });
    dashboards.upsert(existing);
    alert("Pinned to dashboard “Pinned from Chat”.");
  };

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ciq-purple)]">Recommendations</h1>
        <p className="text-sm text-[var(--ciq-ink-soft)]">
          Output surface for workflow recommendations — rationale + suggested actions. v1 doesn't execute actions; it routes the human.
        </p>
      </div>

      {recs.length === 0 && (
        <div className="card p-6 text-sm text-[var(--ciq-ink-soft)]">
          No recommendations yet. Run an RCA workflow and click <em>Generate recommendation</em>.
        </div>
      )}

      <div className="space-y-3">
        {recs.map((inv) => (
          <div key={inv.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--ciq-purple)]">{inv.recommendation.title}</div>
                <div className="text-xs text-[var(--ciq-ink-soft)]">
                  Investigation · {inv.metricId} · {new Date(inv.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="ml-auto flex gap-1.5">
                <button onClick={() => router.push(`/workflows/rca/${inv.id}`)} className="chip">Open investigation</button>
                <button onClick={() => pin(inv)} className="chip">📌 Pin</button>
              </div>
            </div>
            <div className="text-sm mt-2">{inv.recommendation.rationale}</div>
            <div className="mt-3 grid md:grid-cols-3 gap-2">
              {inv.recommendation.actions.map((a: any, i: number) => (
                <div key={i} className="rounded-md border bg-[#faf9fb] p-2">
                  <div className="text-[10px] uppercase tracking-wider text-[#9a92a8]">{a.owner}</div>
                  <div className="text-sm text-[var(--ciq-purple)] font-medium">{a.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
