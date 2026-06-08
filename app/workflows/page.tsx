"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateAlerts } from "@/lib/alerts/generator";
import {
  useAcknowledged,
  useClient,
  useInvestigations,
  useSkill,
} from "@/lib/state/store";

const templates = [
  {
    id: "rca",
    name: "RCA / Gap-to-Plan",
    description: "Decompose Revenue = Traffic × Conversion × ASP, rank contributors, branch into L2/L3, recommend.",
    status: "deep" as const,
    kind: "rca" as const,
  },
  {
    id: "promo",
    name: "Promo Effectiveness",
    description: "Lift vs baseline, days on promo, type & value, promo-based sales by SKU.",
    status: "functional" as const,
    kind: "promo" as const,
  },
  {
    id: "sku-rationalization",
    name: "SKU Rationalization",
    description: "Identify under-performing SKUs against contribution, ASP, and content health.",
    status: "stub" as const,
    kind: "sku_rationalization" as const,
  },
  {
    id: "availability",
    name: "Availability",
    description: "Availability%, PO fill, sellable inventory; revenue lost to OOS.",
    status: "stub" as const,
    kind: "availability" as const,
  },
];

const sevDot = (s: "high" | "med" | "low") =>
  s === "high" ? "bg-[var(--red-500)]" : s === "med" ? "bg-[var(--amber-500)]" : "bg-[var(--sky-500)]";

export default function WorkflowsPage() {
  const [client] = useClient();
  const { skill } = useSkill(client);
  const router = useRouter();
  const investigations = useInvestigations(client);
  const acks = useAcknowledged();
  const alerts = useMemo(() => generateAlerts(client, skill), [client, skill]);

  const newRca = () => {
    const id = `inv-${client}-${Date.now()}`;
    sessionStorage.setItem(`ally:seed:${id}`, JSON.stringify({
      clientId: client,
      metricId: skill.primaryMetric,
    }));
    router.push(`/workflows/rca/${id}`);
  };

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-end gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--fg)]">Workflows</h1>
          <p className="mt-1 text-[14px] text-[var(--fg-muted)] max-w-2xl">
            Triggered analyses and templated, re-runnable investigations. Every workflow is skill-aware; outputs are diffable artifacts.
          </p>
        </div>
        <Link href="/builder/workflows" className="ml-auto h-9 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--violet-500)] transition">
          + Create workflow
        </Link>
      </div>

      {/* TRIGGERED */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fg)]">Triggered</h2>
          <span className="eyebrow">{alerts.length} open</span>
        </div>
        <div className="space-y-2">
          {alerts.map((a) => {
            const acked = acks.isAcked(a.alertKey);
            return (
              <div key={a.id} className={`card p-4 transition ${acked ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full ${sevDot(a.severity)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[var(--fg-muted)] uppercase tracking-wider">{a.name}</span>
                      <span className="text-[11px] text-[var(--fg-subtle)]">·</span>
                      <span className="text-[11px] text-[var(--fg-muted)]">priority {a.priority}</span>
                    </div>
                    <div className="text-[14px] text-[var(--fg)] leading-snug mt-0.5">{a.summary}</div>
                    {a.affectedSkus.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.affectedSkus.slice(0, 6).map((s) => <span key={s} className="chip text-[10px]">{s}</span>)}
                        {a.affectedSkus.length > 6 && <span className="chip text-[10px]">+{a.affectedSkus.length - 6} more</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      className="h-8 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-3 text-xs font-semibold text-white hover:bg-[var(--violet-500)] transition"
                      onClick={() => {
                        const id = `inv-${client}-${Date.now()}`;
                        sessionStorage.setItem(`ally:seed:${id}`, JSON.stringify({
                          clientId: client,
                          metricId: a.metricId,
                          fromQuestion: `Alert: ${a.name}`,
                        }));
                        router.push(`/workflows/rca/${id}`);
                      }}
                    >
                      Investigate
                    </button>
                    <button className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-50" onClick={() => acks.ack(a.alertKey)} disabled={acked}>
                      {acked ? "Acknowledged" : "Acknowledge"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {alerts.length === 0 && (
            <div className="card p-6 text-sm text-[var(--fg-muted)]">No triggered workflows.</div>
          )}
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="space-y-3">
        <h2 className="text-[16px] font-semibold text-[var(--fg)]">Templates</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-[var(--fg)]">{t.name}</div>
                  <div className="text-[12px] text-[var(--fg-muted)] mt-0.5 leading-snug">{t.description}</div>
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  t.status === "deep" ? "bg-[var(--violet-50)] text-[var(--violet-700)]"
                  : t.status === "functional" ? "bg-[var(--gray-100)] text-[var(--gray-700)]"
                  : "bg-[var(--gray-50)] text-[var(--gray-500)]"
                }`}>
                  {t.status}
                </span>
              </div>
              {t.kind === "rca" && (
                <button onClick={newRca} className="h-8 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-3 text-xs font-semibold text-white hover:bg-[var(--violet-500)] transition">
                  Run new RCA
                </button>
              )}
              {t.kind === "promo" && (
                <button onClick={() => router.push(`/dashboards/promo`)} className="btn btn-ghost">Open promo dashboard</button>
              )}
              {t.kind !== "rca" && t.kind !== "promo" && (
                <button disabled className="btn btn-subtle opacity-60">Template stub</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SAVED INVESTIGATIONS */}
      {investigations.list.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold text-[var(--fg)]">Saved investigations <span className="eyebrow ml-1">{investigations.list.length}</span></h2>
          <div className="grid md:grid-cols-2 gap-3">
            {investigations.list.map((inv) => (
              <div key={inv.id} className="card p-3">
                <div className="text-[13px] font-semibold text-[var(--fg)]">{inv.metricId}</div>
                <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                  {new Date(inv.createdAt).toLocaleString()} · {inv.cards.length} cards{inv.recommendation ? " · recommendation" : ""}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => router.push(`/workflows/rca/${inv.id}`)} className="btn btn-ghost btn-sm h-8 text-xs">Open</button>
                  <button
                    onClick={() => {
                      const id = `inv-${client}-${Date.now()}`;
                      sessionStorage.setItem(`ally:seed:${id}`, JSON.stringify({
                        clientId: client,
                        metricId: inv.metricId,
                        fromQuestion: `Re-run of ${inv.id}`,
                      }));
                      router.push(`/workflows/rca/${id}`);
                    }}
                    className="btn btn-subtle h-8 text-xs"
                  >
                    Re-run → diff
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
