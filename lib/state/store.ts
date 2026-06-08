"use client";
import { useCallback, useEffect, useState } from "react";
import { newBalanceSkill } from "@/lib/skills/newbalance";
import { nestleSkill } from "@/lib/skills/nestle";
import type { SkillFile } from "@/lib/skills/types";

const NS = "ally.v1";
const k = (key: string) => `${NS}.${key}`;

export type AppMode = "client" | "builder";

export type Persona = "end-user" | "csm" | "fde";

export type Notification = {
  id: string;
  ts: number;
  clientId: string;
  title: string;
  body: string;
  investigationId?: string;
  channel: "email" | "slack";
  read: boolean;
};

export type AcknowledgedAlert = { alertKey: string; ts: number };

export type Feedback = { messageId: string; vote: "up" | "down"; ts: number };

export type ChatThread = {
  id: string;
  clientId: string;
  messages: any[];
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(k(key));
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k(key), JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(`ally:${key}`));
  } catch {}
}

const defaultSkills: Record<string, SkillFile> = {
  "new-balance": newBalanceSkill,
  "nestle": nestleSkill,
};

export function useClient() {
  const [client, setClient] = useState<string>("nestle");
  useEffect(() => {
    // Single-client app — always reset to nestle and persist.
    write("client", "nestle");
    setClient("nestle");
  }, []);
  const set = useCallback((c: string) => {
    write("client", c);
    setClient(c);
  }, []);
  return [client, set] as const;
}

export function useAppMode() {
  const [mode, setMode] = useState<AppMode>("client");
  useEffect(() => {
    setMode(read<AppMode>("mode", "client"));
  }, []);
  const set = useCallback((m: AppMode) => {
    write("mode", m);
    setMode(m);
  }, []);
  return [mode, set] as const;
}

export function usePersona() {
  const [persona, setPersonaState] = useState<Persona>("end-user");
  useEffect(() => {
    setPersonaState(read<Persona>("persona", "end-user"));
    const h = () => setPersonaState(read<Persona>("persona", "end-user"));
    window.addEventListener("ally:persona", h);
    return () => window.removeEventListener("ally:persona", h);
  }, []);
  const set = useCallback((p: Persona) => {
    write("persona", p);
    setPersonaState(p);
  }, []);
  return [persona, set] as const;
}

export function useSkill(clientId: string) {
  const [skill, setSkill] = useState<SkillFile>(defaultSkills[clientId]);
  useEffect(() => {
    const saved = read<SkillFile | null>(`skill.${clientId}`, null);
    setSkill(saved || defaultSkills[clientId]);
    const h = () => setSkill(read<SkillFile>(`skill.${clientId}`, defaultSkills[clientId]));
    window.addEventListener(`ally:skill.${clientId}`, h);
    return () => window.removeEventListener(`ally:skill.${clientId}`, h);
  }, [clientId]);
  const update = useCallback(
    (patch: Partial<SkillFile> & { graduatedNote?: string }) => {
      const current = read<SkillFile>(`skill.${clientId}`, defaultSkills[clientId]);
      const { graduatedNote, ...rest } = patch;
      const next: SkillFile = {
        ...current,
        ...rest,
        graduatedEdits: graduatedNote
          ? [...(current.graduatedEdits || []), { ts: Date.now(), note: graduatedNote }]
          : current.graduatedEdits,
      };
      write(`skill.${clientId}`, next);
      setSkill(next);
    },
    [clientId],
  );
  const reset = useCallback(() => {
    write(`skill.${clientId}`, defaultSkills[clientId]);
    setSkill(defaultSkills[clientId]);
  }, [clientId]);
  return { skill, update, reset };
}

export function useDashboards(clientId: string) {
  const key = `dashboards.${clientId}`;
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    setList(read<any[]>(key, []));
    const h = () => setList(read<any[]>(key, []));
    window.addEventListener(`ally:${key}`, h);
    return () => window.removeEventListener(`ally:${key}`, h);
  }, [key]);
  const upsert = useCallback(
    (db: any) => {
      const all = read<any[]>(key, []);
      const i = all.findIndex((d) => d.id === db.id);
      if (i >= 0) all[i] = db;
      else all.push(db);
      write(key, all);
      setList(all);
    },
    [key],
  );
  const remove = useCallback(
    (id: string) => {
      const all = read<any[]>(key, []).filter((d) => d.id !== id);
      write(key, all);
      setList(all);
    },
    [key],
  );
  return { list, upsert, remove };
}

export function useGoldenQueries(clientId: string) {
  const key = `golden.${clientId}`;
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    setList(read<any[]>(key, []));
    const h = () => setList(read<any[]>(key, []));
    window.addEventListener(`ally:${key}`, h);
    return () => window.removeEventListener(`ally:${key}`, h);
  }, [key]);
  const add = useCallback(
    (g: any) => {
      const all = read<any[]>(key, []);
      all.push(g);
      write(key, all);
      setList(all);
    },
    [key],
  );
  const update = useCallback(
    (id: string, patch: any) => {
      const all = read<any[]>(key, []).map((g) => (g.id === id ? { ...g, ...patch } : g));
      write(key, all);
      setList(all);
    },
    [key],
  );
  return { list, add, update };
}

export type SkillLibraryEntry = {
  id: string;
  name: string;
  description: string;
  body: string;        // markdown
  builtIn: boolean;
  updatedAt: number;
};

const SEED_SKILLS: SkillLibraryEntry[] = [
  {
    id: "rca-gap-to-plan",
    name: "RCA — Gap to Plan",
    description: "Decompose revenue gap into Traffic × Conversion × ASP and rank contributors.",
    builtIn: true,
    updatedAt: 0,
    body: `# RCA — Gap to Plan

When revenue is off plan, walk the identity:

\`\`\`
Revenue = Glance Views × Unit Conversion × ASP
\`\`\`

1. **Decompose** the gap into the three drivers above and rank by contribution.
2. **Branch** on the largest driver:
   - Traffic → check share of voice, organic rank, paid spend, deal page visibility.
   - Conversion → check content health, reviews, price competitiveness, promo visibility.
   - ASP → check mix shift, promo depth, pack size changes.
3. **Drill** into the top SKU contributors inside the branch and surface a recommendation.

Defaults:
- Comparison: vs Plan, trailing 13 weeks.
- Threshold to investigate: −10% gap to plan.
- First suspect: traffic (configurable per client).
`,
  },
  {
    id: "promo-effectiveness",
    name: "Promo Effectiveness",
    description: "Measure incremental lift vs baseline for a promo window.",
    builtIn: true,
    updatedAt: 0,
    body: `# Promo Effectiveness

For a SKU or category on promo, compute:

- **Baseline** = trailing 4 weeks of ordered units before the promo window.
- **Lift** = (promo-window units / baseline) − 1.
- **Days on promo** and **promo type** are inputs, not outputs.

Flag a promo as **underperforming** if lift < 15% AND ROAS < 2.0.

Always show the promo-badge visibility check alongside lift — a discount with a missing badge is a false negative.
`,
  },
  {
    id: "availability-watch",
    name: "Availability Watch",
    description: "Track availability% and revenue lost to OOS.",
    builtIn: true,
    updatedAt: 0,
    body: `# Availability Watch

Track three numbers, in this order:

1. **Availability %** — sellable on-hand / total catalog at the retailer.
2. **PO fill rate** — units accepted / units ordered, trailing 4 weeks.
3. **Revenue lost to OOS** — ordered_revenue gap on days a top-50 SKU was OOS.

Escalate when availability drops below **92%** OR a top-10 SKU is OOS for more than 48 hours.
`,
  },
  {
    id: "buy-box-loss",
    name: "Buy Box Loss",
    description: "Detect buy box loss patterns and flag the likely cause.",
    builtIn: true,
    updatedAt: 0,
    body: `# Buy Box Loss

For each SKU losing buy box:

- Compare current price to lowest 3P offer.
- Check FBA / Prime eligibility.
- Surface seller name + offer count.

Recommendation logic:
- If price gap < 1% and 3P is FBA → likely algorithmic rotation, monitor 24h.
- If price gap > 3% → flag for pricing action.
- If new 3P seller within 7 days → flag for MAP enforcement.
`,
  },
  {
    id: "content-health",
    name: "Content Health",
    description: "Score SKU pages on title, bullets, images, A+, and reviews.",
    builtIn: true,
    updatedAt: 0,
    body: `# Content Health

Score each SKU 0–100 on:

- **Title** — keyword coverage, length, brand position.
- **Bullets** — count ≥ 5, scannable, benefit-led.
- **Images** — main + 6 secondary, including lifestyle and infographic.
- **A+ / EBC** — present, on-brand, mobile-readable.
- **Reviews** — count, rating, recency.

Below **70** flags for content uplift. Below **50** is escalated to brand team weekly.
`,
  },
];

export function useSkillLibrary() {
  const key = "skills.library";
  const [list, setList] = useState<SkillLibraryEntry[]>([]);
  useEffect(() => {
    const saved = read<SkillLibraryEntry[] | null>(key, null);
    if (!saved || saved.length === 0) {
      write(key, SEED_SKILLS);
      setList(SEED_SKILLS);
    } else {
      setList(saved);
    }
    const h = () => setList(read<SkillLibraryEntry[]>(key, SEED_SKILLS));
    window.addEventListener(`ally:${key}`, h);
    return () => window.removeEventListener(`ally:${key}`, h);
  }, []);
  const upsert = useCallback((s: SkillLibraryEntry) => {
    const all = read<SkillLibraryEntry[]>(key, SEED_SKILLS);
    const i = all.findIndex((x) => x.id === s.id);
    const next: SkillLibraryEntry = { ...s, updatedAt: Date.now() };
    if (i >= 0) all[i] = next;
    else all.unshift(next);
    write(key, all);
    setList(all);
  }, []);
  const remove = useCallback((id: string) => {
    const all = read<SkillLibraryEntry[]>(key, SEED_SKILLS).filter((s) => s.id !== id);
    write(key, all);
    setList(all);
  }, []);
  return { list, upsert, remove };
}

export function useAgents(clientId: string) {
  const key = `agents.${clientId}`;
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    setList(read<any[]>(key, []));
    const h = () => setList(read<any[]>(key, []));
    window.addEventListener(`ally:${key}`, h);
    return () => window.removeEventListener(`ally:${key}`, h);
  }, [key]);
  const upsert = useCallback(
    (a: any) => {
      const all = read<any[]>(key, []);
      const i = all.findIndex((x) => x.id === a.id);
      if (i >= 0) all[i] = a;
      else all.push(a);
      write(key, all);
      setList(all);
    },
    [key],
  );
  return { list, upsert };
}

export function useNotifications() {
  const key = "notifications";
  const [list, setList] = useState<Notification[]>([]);
  useEffect(() => {
    setList(read<Notification[]>(key, []));
    const h = () => setList(read<Notification[]>(key, []));
    window.addEventListener(`ally:${key}`, h);
    return () => window.removeEventListener(`ally:${key}`, h);
  }, []);
  const push = useCallback((n: Omit<Notification, "id" | "ts" | "read">) => {
    const all = read<Notification[]>(key, []);
    const next: Notification = { ...n, id: `n-${Date.now()}`, ts: Date.now(), read: false };
    all.unshift(next);
    write(key, all);
    setList(all);
    return next;
  }, []);
  const markRead = useCallback((id: string) => {
    const all = read<Notification[]>(key, []).map((n) => (n.id === id ? { ...n, read: true } : n));
    write(key, all);
    setList(all);
  }, []);
  return { list, push, markRead };
}

export function useInvestigations(clientId: string) {
  const key = `investigations.${clientId}`;
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    setList(read<any[]>(key, []));
    const h = () => setList(read<any[]>(key, []));
    window.addEventListener(`ally:${key}`, h);
    return () => window.removeEventListener(`ally:${key}`, h);
  }, [key]);
  const save = useCallback(
    (inv: any) => {
      const all = read<any[]>(key, []);
      const i = all.findIndex((x) => x.id === inv.id);
      if (i >= 0) all[i] = inv;
      else all.unshift(inv);
      write(key, all);
      setList(all);
    },
    [key],
  );
  return { list, save };
}

export function useAcknowledged() {
  const key = "alerts.acks";
  const [list, setList] = useState<AcknowledgedAlert[]>([]);
  useEffect(() => {
    setList(read<AcknowledgedAlert[]>(key, []));
    const h = () => setList(read<AcknowledgedAlert[]>(key, []));
    window.addEventListener(`ally:${key}`, h);
    return () => window.removeEventListener(`ally:${key}`, h);
  }, []);
  const ack = useCallback((alertKey: string) => {
    const all = read<AcknowledgedAlert[]>(key, []).filter((a) => a.alertKey !== alertKey);
    all.push({ alertKey, ts: Date.now() });
    write(key, all);
    setList(all);
  }, []);
  return { list, ack, isAcked: (k: string) => list.some((a) => a.alertKey === k) };
}

export function useFeedback() {
  const key = "feedback";
  const [list, setList] = useState<Feedback[]>([]);
  useEffect(() => setList(read<Feedback[]>(key, [])), []);
  const vote = useCallback((messageId: string, v: "up" | "down") => {
    const all = read<Feedback[]>(key, []).filter((f) => f.messageId !== messageId);
    all.push({ messageId, vote: v, ts: Date.now() });
    write(key, all);
    setList(all);
  }, []);
  return { list, vote };
}
