"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { semanticRegistry } from "@/lib/semantic/registry";
import { runFirstPass, generateRecommendation } from "@/lib/rca/engine";
import {
  useAgents,
  useClient,
  useInvestigations,
  useNotifications,
  useSkill,
} from "@/lib/state/store";

type WorkflowDomain = "Retail Analytics" | "B2B Sales & Finance" | "Marketing" | "Operations";
type Channel = "email" | "slack";

type Workflow = {
  id: string;
  domain: WorkflowDomain;
  name: string;
  clientId: string;
  simplified: boolean;
  activationEnabled: boolean;
  activationTrigger: string;       // plain English condition
  workDescription: string;         // plain English work
  deepAnalysis: boolean;
  trigger: { metricId: string; condition: "below" | "above"; threshold: number };
  analysisWorkflow: "rca" | "promo" | "availability";
  notify: Channel[];
  schedule: {
    startDate: string;             // YYYY-MM-DD
    startTime: string;             // HH:mm
    repeatEvery: number;
    repeatUnit: "Hours" | "Days" | "Weeks";
  };
  enabled: boolean;
  runHistory: { ts: number; result: string; investigationId?: string }[];
};

const DOMAINS: WorkflowDomain[] = ["Retail Analytics", "B2B Sales & Finance", "Marketing", "Operations"];

function blankDraft(client: string, primaryMetric: string): Workflow {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "",
    domain: "Retail Analytics",
    name: "Gap-to-plan watcher",
    clientId: client,
    simplified: false,
    activationEnabled: true,
    activationTrigger: "if shipped revenue drops by 10% vs plan",
    workDescription: "Notify me and run historical analysis of previous orders for the period.",
    deepAnalysis: false,
    trigger: { metricId: primaryMetric, condition: "below", threshold: 10 },
    analysisWorkflow: "rca",
    notify: ["slack"],
    schedule: { startDate: today, startTime: "09:00", repeatEvery: 1, repeatUnit: "Days" },
    enabled: true,
    runHistory: [],
  };
}

export default function BuilderWorkflowsPage() {
  const [client] = useClient();
  const { skill } = useSkill(client);
  const agents = useAgents(client);
  const notifications = useNotifications();
  const investigations = useInvestigations(client);

  const [draft, setDraft] = useState<Workflow>(() => blankDraft(client, skill.primaryMetric));
  const [triggerTested, setTriggerTested] = useState<null | string>(null);
  const [workTested, setWorkTested] = useState<null | string>(null);
  const [showForm, setShowForm] = useState(true);

  const counts = useMemo(() => ({
    total: agents.list.length,
    enabled: agents.list.filter((a: any) => a.enabled).length,
  }), [agents.list]);

  const set = <K extends keyof Workflow>(k: K, v: Workflow[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setTrigger = (patch: Partial<Workflow["trigger"]>) => setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...patch } }));
  const setSchedule = (patch: Partial<Workflow["schedule"]>) => setDraft((d) => ({ ...d, schedule: { ...d.schedule, ...patch } }));

  const testTrigger = () => {
    setTriggerTested(`Parsed → metric: ${draft.trigger.metricId} · ${draft.trigger.condition} threshold ${draft.trigger.threshold}%. Would fire ${Math.floor(Math.random() * 3) + 1}× this week.`);
  };
  const testWork = () => {
    setWorkTested(`Plan → ${draft.analysisWorkflow.toUpperCase()} on ${draft.trigger.metricId}${draft.deepAnalysis ? " (deep)" : ""}. Output: cards + recommendation.`);
  };

  const create = () => {
    const wf: Workflow = { ...draft, id: `wf-${Date.now()}` };
    agents.upsert(wf as any);
    setDraft(blankDraft(client, skill.primaryMetric));
    setTriggerTested(null);
    setWorkTested(null);
    setShowForm(false);
  };

  const simulate = (a: Workflow) => {
    const fp = runFirstPass({ clientId: a.clientId, metricId: a.trigger.metricId, skill });
    const rec = generateRecommendation({ clientId: a.clientId, metricId: a.trigger.metricId, skill }, fp.cards);
    const invId = `inv-wf-${Date.now()}`;
    investigations.save({
      id: invId,
      clientId: a.clientId,
      metricId: a.trigger.metricId,
      createdAt: Date.now(),
      cards: fp.cards,
      recommendation: rec,
      skillSnapshot: skill,
    });
    const summary = `Workflow “${a.name}” fired · ${a.trigger.metricId} ${a.trigger.condition} threshold ${a.trigger.threshold}%.`;
    notifications.push({
      clientId: a.clientId,
      title: a.name,
      body: summary,
      investigationId: invId,
      channel: a.notify[0] || "slack",
    });
    a.runHistory.unshift({ ts: Date.now(), result: summary, investigationId: invId });
    agents.upsert(a as any);
  };

  const toggle = (a: Workflow) => agents.upsert({ ...a, enabled: !a.enabled } as any);

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end gap-3">
        <div>
          <div className="eyebrow mb-1">Builder · Workflows</div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--fg)]">Create Workflow</h1>
          <p className="mt-1 text-[14px] text-[var(--fg-muted)] max-w-2xl">
            A workflow watches a signal, pre-computes a first pass, and drops a notification + ready-to-review investigation. Humans drive the conclusion.
          </p>
        </div>
        <div className="ml-auto text-[12px] text-[var(--fg-muted)]">
          {counts.total} workflow{counts.total === 1 ? "" : "s"} · {counts.enabled} enabled
        </div>
      </div>

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="h-9 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--violet-500)] transition">
          + New workflow
        </button>
      )}

      {showForm && (
        <div className="card p-6 space-y-6">
          {/* Domain + simplified form */}
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <Field label="Select your Domain">
              <select
                value={draft.domain}
                onChange={(e) => set("domain", e.target.value as WorkflowDomain)}
                className="input w-full"
              >
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <div className="flex items-center justify-end gap-3 pt-7">
              <span className="text-[13px] text-[var(--fg-muted)]">Use simplified form</span>
              <Toggle checked={draft.simplified} onChange={(v) => set("simplified", v)} />
            </div>
          </div>

          {/* Workflow Name */}
          <Field label="Workflow Name">
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              className="input w-full"
              placeholder="e.g. Gap-to-plan watcher"
            />
          </Field>

          {/* Activation Trigger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[14px] font-semibold text-[var(--fg)]">Activation Trigger</label>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--fg-muted)]">
                  <InfoDot /> No activation trigger
                </span>
                <Toggle
                  checked={!draft.activationEnabled}
                  onChange={(v) => set("activationEnabled", !v)}
                />
              </div>
            </div>

            <textarea
              value={draft.activationTrigger}
              onChange={(e) => set("activationTrigger", e.target.value)}
              disabled={!draft.activationEnabled}
              rows={3}
              className="input w-full !h-auto py-2 disabled:opacity-50"
              placeholder='e.g. "if shipped revenue drops by 10% vs plan"'
            />

            {/* Structured trigger row (so it actually maps to a metric in the engine) */}
            <div className="grid md:grid-cols-3 gap-3">
              <Field small label="Metric">
                <select
                  value={draft.trigger.metricId}
                  onChange={(e) => setTrigger({ metricId: e.target.value })}
                  className="input w-full"
                  disabled={!draft.activationEnabled}
                >
                  {semanticRegistry.metrics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Field>
              <Field small label="Condition">
                <select
                  value={draft.trigger.condition}
                  onChange={(e) => setTrigger({ condition: e.target.value as any })}
                  className="input w-full"
                  disabled={!draft.activationEnabled}
                >
                  <option value="below">% breach below plan/prior</option>
                  <option value="above">% breach above plan/prior</option>
                </select>
              </Field>
              <Field small label="Threshold (%)">
                <input
                  type="number"
                  value={draft.trigger.threshold}
                  onChange={(e) => setTrigger({ threshold: Number(e.target.value) })}
                  className="input w-full"
                  disabled={!draft.activationEnabled}
                />
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={testTrigger} disabled={!draft.activationEnabled} className="btn btn-ghost h-8 text-xs disabled:opacity-50">Test</button>
              {triggerTested && <span className="text-[12px] text-[var(--violet-700)]">{triggerTested}</span>}
            </div>
          </div>

          {/* Work Description */}
          <div className="space-y-3">
            <label className="block text-[14px] font-semibold text-[var(--fg)]">Work Description</label>
            <textarea
              value={draft.workDescription}
              onChange={(e) => set("workDescription", e.target.value)}
              rows={3}
              className="input w-full !h-auto py-2"
              placeholder="Describe what the workflow should do when it fires…"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Field small label="Run workflow">
                <select
                  value={draft.analysisWorkflow}
                  onChange={(e) => set("analysisWorkflow", e.target.value as any)}
                  className="input w-full"
                >
                  <option value="rca">RCA</option>
                  <option value="promo">Promo Effectiveness</option>
                  <option value="availability">Availability</option>
                </select>
              </Field>
              <Field small label="Notify on">
                <div className="flex items-center gap-3 h-10">
                  {(["slack", "email"] as Channel[]).map((c) => {
                    const checked = draft.notify.includes(c);
                    return (
                      <label key={c} className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[13px] cursor-pointer ${checked ? "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-700)]" : "border-[var(--border)] text-[var(--fg-muted)]"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => set("notify", e.target.checked ? [...draft.notify, c] : draft.notify.filter((x) => x !== c))}
                          className="hidden"
                        />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={testWork} className="btn btn-ghost h-8 text-xs">Test</button>
              {workTested && <span className="text-[12px] text-[var(--violet-700)]">{workTested}</span>}
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={draft.deepAnalysis} onChange={(v) => set("deepAnalysis", v)} />
              <span className="text-[13px] text-[var(--fg)]">Enable deep analysis</span>
              <InfoDot />
            </div>
          </div>

          {/* When */}
          <div className="space-y-3">
            <label className="block text-[14px] font-semibold text-[var(--fg)]">When?</label>
            <div className="grid md:grid-cols-2 gap-3">
              <Field small label="Start at">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={draft.schedule.startDate}
                    onChange={(e) => setSchedule({ startDate: e.target.value })}
                    className="input w-full"
                  />
                  <input
                    type="time"
                    value={draft.schedule.startTime}
                    onChange={(e) => setSchedule({ startTime: e.target.value })}
                    className="input w-32"
                  />
                </div>
              </Field>
              <Field small label="Repeat every">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={draft.schedule.repeatEvery}
                    onChange={(e) => setSchedule({ repeatEvery: Number(e.target.value) })}
                    className="input w-24"
                  />
                  <select
                    value={draft.schedule.repeatUnit}
                    onChange={(e) => setSchedule({ repeatUnit: e.target.value as any })}
                    className="input flex-1"
                  >
                    <option>Hours</option>
                    <option>Days</option>
                    <option>Weeks</option>
                  </select>
                </div>
              </Field>
            </div>
          </div>

          {/* How should we notify you */}
          <div className="space-y-2">
            <div className="text-[14px] font-semibold text-[var(--fg)]">How should we notify you?</div>
            <div className="flex flex-wrap gap-2">
              {(["slack", "email"] as Channel[]).map((c) => {
                const checked = draft.notify.includes(c);
                return (
                  <label key={c} className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[13px] cursor-pointer ${checked ? "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-700)]" : "border-[var(--border)] text-[var(--fg-muted)]"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => set("notify", e.target.checked ? [...draft.notify, c] : draft.notify.filter((x) => x !== c))}
                      className="hidden"
                    />
                    {c}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
            <button onClick={create} className="h-9 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-4 text-sm font-semibold text-white hover:bg-[var(--violet-500)] transition">
              Create workflow
            </button>
            <button onClick={() => setDraft(blankDraft(client, skill.primaryMetric))} className="btn btn-ghost h-9 text-sm">Reset</button>
            <span className="ml-auto text-[12px] text-[var(--fg-muted)]">Skills are picked up from <Link className="underline" href="/builder/skills">Skills library</Link>.</span>
          </div>
        </div>
      )}

      {/* Existing workflows */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fg)]">Workflows · {client}</h2>
          <span className="eyebrow">{counts.total} total</span>
        </div>
        {agents.list.length === 0 ? (
          <div className="card p-6 text-sm text-[var(--fg-muted)]">No workflows yet — create one above.</div>
        ) : (
          <div className="space-y-2">
            {agents.list.map((a: any) => {
              const wf = a as Workflow;
              return (
                <div key={wf.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-semibold text-[var(--fg)]">{wf.name}</div>
                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--gray-100)] text-[var(--gray-700)]">{wf.domain || "Retail Analytics"}</span>
                      </div>
                      <div className="text-[12px] text-[var(--fg-muted)] mt-0.5">
                        {wf.trigger?.metricId} {wf.trigger?.condition} {wf.trigger?.threshold}% → run {wf.analysisWorkflow} → notify {wf.notify?.join(" + ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggle(wf)} className="chip">{wf.enabled ? "Enabled" : "Disabled"}</button>
                      <button onClick={() => simulate(wf)} className="h-8 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-3 text-xs font-semibold text-white hover:bg-[var(--violet-500)] transition">Simulate trigger</button>
                    </div>
                  </div>
                  {wf.runHistory?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="eyebrow">Run history</div>
                      {wf.runHistory.slice(0, 3).map((r, i) => (
                        <div key={i} className="rounded border bg-[var(--bg-subtle)] p-2 text-[12px]">
                          <div className="text-[var(--fg-muted)]">{new Date(r.ts).toLocaleString()}</div>
                          <div className="text-[var(--fg)]">{r.result}</div>
                          {r.investigationId && (
                            <a href={`/workflows/rca/${r.investigationId}`} className="text-[var(--violet-700)] underline text-xs">Open investigation →</a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-4 space-y-2">
        <div className="text-[14px] font-semibold text-[var(--fg)]">Recent notifications · {notifications.list.filter((n) => n.clientId === client).length}</div>
        <div className="space-y-1.5">
          {notifications.list.filter((n) => n.clientId === client).slice(0, 5).map((n) => (
            <div key={n.id} className="rounded border bg-[var(--bg-subtle)] p-2 text-[12px]">
              <div className="text-[var(--fg-muted)]">{new Date(n.ts).toLocaleString()} · {n.channel}</div>
              <div className="font-semibold text-[var(--fg)]">{n.title}</div>
              <div className="text-[var(--fg-muted)]">{n.body}</div>
            </div>
          ))}
          {notifications.list.filter((n) => n.clientId === client).length === 0 && (
            <div className="text-[12px] text-[var(--fg-muted)]">No notifications yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, small, children }: { label: string; small?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className={`mb-1.5 ${small ? "eyebrow" : "text-[13px] font-medium text-[var(--fg)]"}`}>{label}</div>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}

function InfoDot() {
  return (
    <span className="inline-grid place-items-center w-4 h-4 rounded-full border border-[var(--border)] text-[10px] text-[var(--fg-muted)]">i</span>
  );
}
