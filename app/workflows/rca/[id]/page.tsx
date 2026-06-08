"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EvidenceCard from "@/components/EvidenceCard";
import { expandNode, frontierCard, generateRecommendation, runFirstPass } from "@/lib/rca/engine";
import type { EvidenceCard as Evidence, RecommendationOutput } from "@/lib/rca/engine";
import type { RcaNode } from "@/lib/rca/mapping";
import { askAlly } from "@/lib/ally/client";
import {
  useClient,
  useDashboards,
  useInvestigations,
  useSkill,
} from "@/lib/state/store";
import IntentResolution from "@/components/IntentResolution";

type Seed = { clientId: string; metricId: string; fromQuestion?: string };

export default function RcaWorkflowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client] = useClient();
  const { skill, update: updateSkill } = useSkill(client);
  const dashboards = useDashboards(client);
  const investigations = useInvestigations(client);

  const [seed, setSeed] = useState<Seed | null>(null);
  const [cards, setCards] = useState<Evidence[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationOutput | null>(null);
  const [allyTrace, setAllyTrace] = useState<{ q: string; reply: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [frontier, setFrontier] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideOrder, setOverrideOrder] = useState<string[]>(skill.drillOrder);

  useEffect(() => {
    const raw = sessionStorage.getItem(`ally:seed:${params.id}`);
    if (raw) {
      const s = JSON.parse(raw) as Seed;
      setSeed(s);
      const fp = runFirstPass({ clientId: s.clientId, metricId: s.metricId, skill });
      setCards(fp.cards);
      return;
    }
    // Read saved investigations directly — the hook hydrates lazily and may be
    // empty on first render.
    let savedList: any[] = [];
    try {
      const v = window.localStorage.getItem(`ally.v1.investigations.${client}`);
      savedList = v ? JSON.parse(v) : [];
    } catch {}
    const existing = savedList.find((i) => i.id === params.id);
    if (existing) {
      const s: Seed = { clientId: existing.clientId, metricId: existing.metricId };
      setSeed(s);
      setCards(existing.cards);
      setRecommendation(existing.recommendation || null);
      return;
    }
    // No seed and no saved investigation — start fresh on the primary metric.
    const s: Seed = { clientId: client, metricId: skill.primaryMetric };
    setSeed(s);
    const fp = runFirstPass({ clientId: s.clientId, metricId: s.metricId, skill });
    setCards(fp.cards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const reRunFirstPass = () => {
    if (!seed) return;
    const fp = runFirstPass({ clientId: seed.clientId, metricId: seed.metricId, skill });
    setCards(fp.cards);
    setRecommendation(null);
  };

  const onExpand = async (node: string) => {
    if (!seed) return;
    setBusy(true);
    try {
      const newCard = expandNode(
        { clientId: seed.clientId, metricId: seed.metricId, skill },
        node as RcaNode,
      );
      setCards((c) => [...c, newCard]);
      // Have Ally narrate the next step
      const res = await askAlly({
        question: `Why ${node}?`,
        clientId: seed.clientId,
        skill,
      });
      setAllyTrace((t) => [...t, { q: `Expand → ${node}`, reply: res.reply }]);
    } finally {
      setBusy(false);
    }
  };

  const onFrontier = async () => {
    if (!seed || !frontier.trim()) return;
    const card = frontierCard({ clientId: seed.clientId, metricId: seed.metricId, skill }, frontier.trim());
    setCards((c) => [...c, card]);
    setBusy(true);
    try {
      const res = await askAlly({ question: frontier.trim(), clientId: seed.clientId, skill, frontierHypothesis: frontier.trim() });
      setAllyTrace((t) => [...t, { q: `Frontier → ${frontier.trim()}`, reply: res.reply }]);
    } finally {
      setFrontier("");
      setBusy(false);
    }
  };

  const onRecommend = () => {
    if (!seed) return;
    const rec = generateRecommendation({ clientId: seed.clientId, metricId: seed.metricId, skill }, cards);
    setRecommendation(rec);
  };

  const pinReco = () => {
    if (!recommendation) return;
    const id = `db-${client}-pins`;
    const existing = dashboards.list.find((d) => d.id === id) || {
      id,
      clientId: client,
      name: "Pinned from Chat",
      widgets: [],
      prebuilt: false,
    };
    existing.widgets.push({
      id: `w-rec-${Date.now()}`,
      title: `Recommendation: ${recommendation.title}`,
      intent: { metricId: skill.primaryMetric, dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: skill.comparison },
      chartType: "line",
      size: "md",
      source: "workflow",
    });
    dashboards.upsert(existing);
    alert("Recommendation pinned.");
  };

  const saveInvestigation = () => {
    if (!seed) return;
    investigations.save({
      id: params.id,
      clientId: seed.clientId,
      metricId: seed.metricId,
      createdAt: Date.now(),
      cards,
      recommendation,
      skillSnapshot: skill,
    });
    alert("Saved to Workflows library. Re-run on fresh data to see a diff card.");
  };

  const graduateOverride = () => {
    // Save the user's reordered drill order to the skill, with audit trail
    updateSkill({
      drillOrder: overrideOrder,
      graduatedNote: `Graduated drill order from RCA override: ${overrideOrder.join(" → ")}`,
    });
    setOverrideOpen(false);
    reRunFirstPass();
    alert("Graduated → skill updated. Audit trail in Builder → Skills.");
  };

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div>
          <div className="text-2xl font-semibold text-[var(--ciq-purple)]">RCA workflow · {seed?.metricId}</div>
          <div className="text-sm text-[var(--ciq-ink-soft)]">
            One workflow in the library. First pass is computed by the engine before any LLM call — Ally narrates the path; the math is deterministic.
            {seed?.fromQuestion ? <> Entered via Chat: <em>“{seed.fromQuestion}”</em></> : null}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={reRunFirstPass} className="btn btn-subtle">↻ Re-run first pass</button>
          <button onClick={() => setOverrideOpen(true)} className="btn btn-ghost">Override → Graduate</button>
          <button onClick={saveInvestigation} className="btn btn-ghost">Save → Workflows library</button>
          {!recommendation && <button onClick={onRecommend} className="btn btn-primary">Generate recommendation</button>}
        </div>
      </div>

      {seed && (
        <IntentResolution
          intent={{ metricId: seed.metricId, dimensionIds: skill.drillOrder.slice(0, 1), filters: {}, timeframe: "trailing-13w", comparison: skill.comparison }}
          label={`Investigating ${seed.metricId} · ${skill.comparison} · skill: ${skill.priors.firstSuspect}-first, drill ${skill.drillOrder.join(" → ")}`}
        />
      )}

      {/* Evidence canvas */}
      <div className="space-y-3">
        {cards.map((c) => (
          <EvidenceCard
            key={c.id}
            card={c}
            onExpand={onExpand}
            onPin={() => {
              const id = `db-${client}-pins`;
              const existing = dashboards.list.find((d) => d.id === id) || {
                id, clientId: client, name: "Pinned from Chat", widgets: [], prebuilt: false,
              };
              existing.widgets.push({
                id: `w-${Date.now()}`,
                title: c.title,
                intent: { metricId: c.metric || skill.primaryMetric, dimensionIds: [], filters: {}, timeframe: "trailing-13w", comparison: skill.comparison },
                chartType: c.chart?.type || "line",
                size: "md",
                source: "workflow",
              });
              dashboards.upsert(existing);
            }}
          />
        ))}
      </div>

      {/* Frontier injection */}
      <div className="card p-4 space-y-2">
        <div className="label-xs">Frontier hypothesis (outside L0–L3)</div>
        <div className="flex items-center gap-2">
          <input
            value={frontier}
            onChange={(e) => setFrontier(e.target.value)}
            placeholder='e.g. "top-of-page intent shift on branded queries?"'
            className="flex-1 h-9 px-3 rounded-md border bg-white text-sm"
          />
          <button onClick={onFrontier} className="btn btn-ghost" disabled={busy || !frontier.trim()}>
            Inject as frontier card
          </button>
        </div>
        {allyTrace.length > 0 && (
          <div className="rounded-md border bg-[#fbfaff] p-2.5 text-[12px] space-y-1.5">
            {allyTrace.slice(-3).map((t, i) => (
              <div key={i}><span className="font-semibold text-[var(--ciq-purple)]">{t.q}</span> — {t.reply}</div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendation panel */}
      {recommendation && (
        <div className="card p-4 border-[var(--ciq-accent)]">
          <div className="flex items-center gap-2">
            <span className="tag-l3">REC</span>
            <div className="text-sm font-semibold text-[var(--ciq-purple)]">{recommendation.title}</div>
            <button onClick={pinReco} className="ml-auto chip">📌 Pin to dashboard</button>
          </div>
          <div className="text-sm text-[var(--ciq-ink)] mt-2">{recommendation.rationale}</div>
          <div className="mt-3 grid md:grid-cols-3 gap-2">
            {recommendation.actions.map((a, i) => (
              <div key={i} className="rounded-md border bg-[#faf9fb] p-2">
                <div className="text-[10px] uppercase tracking-wider text-[#9a92a8]">{a.owner}</div>
                <div className="text-sm text-[var(--ciq-purple)] font-medium">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Override modal */}
      {overrideOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
          <div className="card p-5 max-w-md w-full space-y-3 bg-white">
            <div className="text-lg font-semibold text-[var(--ciq-purple)]">Override Ally — Graduate to skill?</div>
            <div className="text-sm text-[var(--ciq-ink-soft)]">
              Reorder the drill path Ally followed. Confirming writes a candidate edit to {client}'s SkillFile with an audit trail.
            </div>
            <div className="space-y-1.5">
              {overrideOrder.map((d, i) => (
                <div key={d} className="flex items-center gap-2 rounded-md border bg-[#faf9fb] p-2">
                  <span className="text-sm flex-1 text-[var(--ciq-purple)] font-medium">{d}</span>
                  <button
                    disabled={i === 0}
                    onClick={() => {
                      const copy = [...overrideOrder];
                      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                      setOverrideOrder(copy);
                    }}
                    className="chip"
                  >↑</button>
                  <button
                    disabled={i === overrideOrder.length - 1}
                    onClick={() => {
                      const copy = [...overrideOrder];
                      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                      setOverrideOrder(copy);
                    }}
                    className="chip"
                  >↓</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-subtle" onClick={() => setOverrideOpen(false)}>Cancel</button>
              <button className="btn btn-primary ml-auto" onClick={graduateOverride}>Graduate to skill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
