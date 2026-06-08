"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KpiTile from "@/components/KpiTile";
import { Sparkline } from "@/components/MiniChart";
import SuggestedPrompts from "@/components/SuggestedPrompts";
import { compute } from "@/lib/semantic/compute";
import { useClient, useSkill } from "@/lib/state/store";
import { getDataset } from "@/lib/data";
import { generateAlerts } from "@/lib/alerts/generator";

export default function PulsePage() {
  const [client] = useClient();
  const { skill } = useSkill(client);
  const router = useRouter();
  const ds = useMemo(() => getDataset(client), [client]);
  const alerts = useMemo(() => generateAlerts(client, skill), [client, skill]);

  const rev = compute(
    { metricId: skill.primaryMetric, dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "vsPlan" },
    client,
  );
  const units = compute(
    { metricId: "ordered_units", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    client,
  );
  const conv = compute(
    { metricId: "unit_conversion", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    client,
  );
  const avail = compute(
    { metricId: "availability", dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: "YoY" },
    client,
  );

  const onPromptPick = (q: string) => {
    // Route to chat with the question pre-asked: chat page will read it from the querystring
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end gap-3">
        <div>
          <div className="text-2xl font-semibold text-[var(--ciq-purple)]">Pulse · {ds.clientLabel}</div>
          <div className="text-sm text-[var(--ciq-ink-soft)]">
            Account health snapshot. Three co-equal surfaces from here: dashboards (standing), alerts (proactive), chat (NL).
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/chat" className="btn btn-primary">Ask Ally</Link>
          <Link href="/dashboards" className="btn btn-ghost">Dashboards</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label={skill.primaryMetric === "shipped_revenue" ? "Shipped Revenue" : "Ordered Revenue"} value={rev.total} delta={rev.comparisonDelta.pct} fmt="currency" />
        <KpiTile label="Ordered Units" value={units.total} delta={units.comparisonDelta.pct} fmt="number" />
        <KpiTile label="Unit Conversion" value={conv.total} delta={conv.comparisonDelta.pct} fmt="percent" />
        <KpiTile label="Availability %" value={avail.total} delta={avail.comparisonDelta.pct} fmt="percent" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card p-4 md:col-span-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-[var(--ciq-purple)]">{skill.primaryMetric === "shipped_revenue" ? "Shipped Revenue" : "Ordered Revenue"} trend</div>
            <span className="chip text-[10px]">vs plan</span>
            <span className="ml-auto label-xs">trailing 13w</span>
          </div>
          <Sparkline rows={ds.trend} yKey="revenue" />
          <div className="ally-claim text-[12px]">
            <span className="label-xs mr-1">Ally:</span>
            Pacing is {rev.comparisonDelta.pct < 0 ? "below" : "above"} plan at {(rev.comparisonDelta.pct * 100).toFixed(1)}% — the dip is concentrated in the back half. Per the {ds.clientLabel} skill ({skill.priors.firstSuspect}-first), the most likely driver is {skill.priors.firstSuspect}.
          </div>
        </div>

        <div className="card p-4 space-y-2">
          <div className="text-sm font-semibold text-[var(--ciq-purple)]">Top alerts</div>
          {alerts.slice(0, 3).map((a) => (
            <Link key={a.id} href="/workflows" className="block rounded-md border bg-[var(--bg-subtle)] p-2 hover:border-[var(--violet-400)] transition">
              <div className="text-[11px] uppercase tracking-wider text-[var(--ciq-ink-soft)]">{a.name}</div>
              <div className="text-sm text-[var(--ciq-purple)] font-medium leading-snug">{a.summary}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="label-xs">Suggested questions · explore the data</div>
        <SuggestedPrompts clientId={client} onPick={onPromptPick} />
      </div>
    </div>
  );
}
