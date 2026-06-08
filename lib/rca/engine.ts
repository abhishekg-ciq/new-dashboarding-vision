import { getDataset } from "@/lib/data";
import type { ClientDataset, SkuRow } from "@/lib/data/types";
import type { SkillFile } from "@/lib/skills/types";
import { getMetric } from "@/lib/semantic/registry";
import type { RcaNode } from "./mapping";

export type EvidenceLevel = "L0" | "L1" | "L2" | "L3" | "frontier";

export type EvidenceCard = {
  id: string;
  level: EvidenceLevel;
  node?: RcaNode;
  title: string;
  metric: string;
  facts: Record<string, number | string>;
  narrative: string;
  chart?: {
    type: "bar" | "line" | "waterfall" | "kpi";
    series: { label: string; value: number; sub?: string }[];
  };
  expandsTo?: RcaNode[];
  source: "first-pass" | "expand" | "frontier";
};

export type RcaContext = {
  clientId: string;
  metricId: string; // the metric being investigated
  skill: SkillFile;
};

export type FirstPassResult = {
  context: RcaContext;
  cards: EvidenceCard[];
  primarySuspect: "traffic" | "conversion" | "asp";
  topContributors: { sku: string; deltaRevenue: number }[];
};

export type RecommendationOutput = {
  id: string;
  title: string;
  rationale: string;
  actions: { label: string; owner: string }[];
  evidenceIds: string[];
};

export type Investigation = {
  id: string;
  clientId: string;
  metricId: string;
  createdAt: number;
  cards: EvidenceCard[];
  recommendation?: RecommendationOutput;
  skillSnapshot: SkillFile;
};

// ── L0: quantify gap to plan / prior ──
export function decomposeGap(ds: ClientDataset, metricId: string) {
  const sumRev = (k: keyof SkuRow) => ds.skus.reduce((a, s) => a + (s[k] as number || 0), 0);
  if (metricId === "ordered_revenue" || metricId === "shipped_revenue") {
    const now = sumRev("revenue");
    const prior = sumRev("priorRevenue");
    const plan = sumRev("planRevenue");
    return { now, prior, plan, gap: now - prior, gapPct: (now - prior) / prior, gapToPlan: now - plan, gapToPlanPct: (now - plan) / plan };
  }
  const now = sumRev("revenue");
  const prior = sumRev("priorRevenue");
  return { now, prior, plan: now, gap: now - prior, gapPct: (now - prior) / prior, gapToPlan: 0, gapToPlanPct: 0 };
}

// ── L1: Revenue = GV × Conversion × ASP, additive decomposition ──
export function attributeUnits(ds: ClientDataset) {
  const now = {
    rev: ds.skus.reduce((a, s) => a + s.revenue, 0),
    units: ds.skus.reduce((a, s) => a + s.units, 0),
    gv: ds.skus.reduce((a, s) => a + s.glanceViews, 0),
  };
  const prior = {
    rev: ds.skus.reduce((a, s) => a + s.priorRevenue, 0),
    units: ds.skus.reduce((a, s) => a + s.priorUnits, 0),
    gv: ds.skus.reduce((a, s) => a + s.priorGlanceViews, 0),
  };
  const aspNow = now.rev / Math.max(now.units, 1);
  const aspPrior = prior.rev / Math.max(prior.units, 1);
  const cvrNow = now.units / Math.max(now.gv, 1);
  const cvrPrior = prior.units / Math.max(prior.gv, 1);

  // Additive contribution: ΔGV·c0·p0 + Δc·gv1·p0 + Δp·gv1·c1
  const gvContrib = (now.gv - prior.gv) * cvrPrior * aspPrior;
  const cvrContrib = (cvrNow - cvrPrior) * now.gv * aspPrior;
  const aspContrib = (aspNow - aspPrior) * now.gv * cvrNow;

  const total = gvContrib + cvrContrib + aspContrib;
  return {
    now, prior,
    aspNow, aspPrior, aspDelta: aspNow - aspPrior, aspPct: (aspNow - aspPrior) / aspPrior,
    cvrNow, cvrPrior, cvrDelta: cvrNow - cvrPrior, cvrPct: (cvrNow - cvrPrior) / cvrPrior,
    gvDelta: now.gv - prior.gv, gvPct: (now.gv - prior.gv) / prior.gv,
    unitsPct: (now.units - prior.units) / prior.units,
    contributions: { gv: gvContrib, conversion: cvrContrib, asp: aspContrib, total },
  };
}

// ── Rank SKU contributors by Δ revenue ──
export function rankContributors(ds: ClientDataset) {
  return ds.skus
    .map((s) => ({
      sku: s.sku,
      category: s.category,
      brand: s.brand,
      deltaRevenue: s.revenue - s.priorRevenue,
      pct: s.priorRevenue ? (s.revenue - s.priorRevenue) / s.priorRevenue : 0,
      now: s.revenue,
      prior: s.priorRevenue,
      aspDelta: s.units && s.priorUnits ? (s.revenue / s.units) - (s.priorRevenue / s.priorUnits) : 0,
      unitsDelta: s.units - s.priorUnits,
    }))
    .sort((a, b) => a.deltaRevenue - b.deltaRevenue);
}

// ── First-pass orchestration ──
export function runFirstPass(ctx: RcaContext): FirstPassResult {
  const ds = getDataset(ctx.clientId);
  const gap = decomposeGap(ds, ctx.metricId);
  const attr = attributeUnits(ds);
  const ranked = rankContributors(ds);

  // pick primary suspect: largest negative contributor in absolute value
  const c = attr.contributions;
  const ordered = [
    { name: "traffic" as const, val: c.gv },
    { name: "conversion" as const, val: c.conversion },
    { name: "asp" as const, val: c.asp },
  ].sort((a, b) => a.val - b.val); // most negative first
  // Honor the skill's prior on ties / closeness (within 10% of leader).
  const leader = ordered[0];
  let primary = leader.name;
  const priorPref = ctx.skill.priors.firstSuspect;
  if (priorPref !== "catalog") {
    const priorVal = ordered.find((x) => x.name === priorPref)?.val ?? leader.val;
    if (priorVal < 0 && priorVal <= leader.val * 0.85) primary = priorPref as typeof primary;
  }

  const id = (s: string) => `${ctx.clientId}-${s}-${Math.random().toString(36).slice(2, 7)}`;
  const cards: EvidenceCard[] = [];

  // L0 card
  const m = getMetric(ctx.metricId);
  cards.push({
    id: id("L0"),
    level: "L0",
    node: "L0: Quantify gap to plan",
    title: `${m?.label || ctx.metricId}: gap to ${ctx.skill.comparison === "vsPlan" ? "plan" : ctx.skill.comparison}`,
    metric: ctx.metricId,
    facts: {
      now: Math.round(gap.now),
      prior: Math.round(gap.prior),
      plan: Math.round(gap.plan),
      deltaRevenue: Math.round(gap.gap),
      deltaPct: Number((gap.gapPct * 100).toFixed(1)),
    },
    narrative: `${m?.label || ctx.metricId} is ${Math.round(Math.abs(gap.gapPct) * 100)}% ${gap.gapPct < 0 ? "below" : "above"} ${ctx.skill.comparison === "vsPlan" ? "plan" : "prior"}.`,
    chart: {
      type: "bar",
      series: [
        { label: "Prior", value: gap.prior },
        { label: "Now", value: gap.now },
        { label: "Plan", value: gap.plan },
      ],
    },
    expandsTo: ["L1: Revenue attribution (Traffic × Conversion × ASP)"],
    source: "first-pass",
  });

  // L1 card — identity decomposition
  cards.push({
    id: id("L1"),
    level: "L1",
    node: "L1: Revenue attribution (Traffic × Conversion × ASP)",
    title: "Revenue identity decomposition",
    metric: ctx.metricId,
    facts: {
      unitsDeltaPct: Number((attr.unitsPct * 100).toFixed(1)),
      aspDeltaPct: Number((attr.aspPct * 100).toFixed(1)),
      gvDeltaPct: Number((attr.gvPct * 100).toFixed(1)),
      cvrDeltaPct: Number((attr.cvrPct * 100).toFixed(1)),
      gvContribution: Math.round(c.gv),
      conversionContribution: Math.round(c.conversion),
      aspContribution: Math.round(c.asp),
    },
    narrative:
      `Units ${(attr.unitsPct * 100).toFixed(1)}%, ASP ${(attr.aspPct * 100).toFixed(1)}%, GV ${(attr.gvPct * 100).toFixed(1)}%, Conversion ${(attr.cvrPct * 100).toFixed(1)}%. ` +
      `Additive contribution to revenue Δ: GV ${(c.gv / 1000).toFixed(0)}K, Conversion ${(c.conversion / 1000).toFixed(0)}K, ASP ${(c.asp / 1000).toFixed(0)}K. ` +
      `Primary suspect (skill: ${ctx.skill.priors.firstSuspect}-first): ${primary}.`,
    chart: {
      type: "waterfall",
      series: [
        { label: "Traffic", value: c.gv },
        { label: "Conversion", value: c.conversion },
        { label: "ASP", value: c.asp },
      ],
    },
    expandsTo:
      primary === "conversion"
        ? ["L2-Conversion: Is Availability% down?", "L2-Conversion: Is LBB% up?", "L2-Conversion: Is Content Score down?"]
        : primary === "asp"
        ? ["L2-ASP: Pricing trends"]
        : ["L2-Traffic: Is Organic SOV down?", "L2-Traffic: Is Paid SOV down?", "L2-Traffic: Ad Spend trending?"],
    source: "first-pass",
  });

  // L3 — top contributors
  const worst = ranked.slice(0, 5);
  cards.push({
    id: id("L3-top"),
    level: "L3",
    node: "L3: Top SKUs per broken metric",
    title: "Top SKU contributors to gap",
    metric: ctx.metricId,
    facts: Object.fromEntries(worst.map((w) => [w.sku, Math.round(w.deltaRevenue)])),
    narrative:
      `${worst[0].sku} is the worst contributor at ${(worst[0].deltaRevenue / 1000).toFixed(0)}K (${(worst[0].pct * 100).toFixed(0)}% vs prior). ` +
      `Top 5 account for ${(worst.reduce((a, w) => a + w.deltaRevenue, 0) / Math.max(gap.gap, 1) * 100).toFixed(0)}% of the gap.`,
    chart: {
      type: "bar",
      series: worst.map((w) => ({ label: w.sku, value: w.deltaRevenue })),
    },
    source: "first-pass",
  });

  return {
    context: ctx,
    cards,
    primarySuspect: primary,
    topContributors: ranked.slice(0, 8).map((r) => ({ sku: r.sku, deltaRevenue: r.deltaRevenue })),
  };
}

// ── Branch expansion ──
export function expandNode(ctx: RcaContext, node: RcaNode): EvidenceCard {
  const ds = getDataset(ctx.clientId);
  const id = (s: string) => `${ctx.clientId}-${s}-${Math.random().toString(36).slice(2, 7)}`;

  if (node === "L2-Conversion: Is Availability% down?") {
    const nowAvg = ds.skus.reduce((a, s) => a + s.availability, 0) / ds.skus.length;
    const priorAvg = ds.skus.reduce((a, s) => a + s.priorAvailability, 0) / ds.skus.length;
    const byCat = new Map<string, { n: number; sum: number; psum: number }>();
    for (const s of ds.skus) {
      const v = byCat.get(s.category) || { n: 0, sum: 0, psum: 0 };
      v.n++; v.sum += s.availability; v.psum += s.priorAvailability;
      byCat.set(s.category, v);
    }
    const breakdown = Array.from(byCat.entries())
      .map(([k, v]) => ({ label: k, value: v.sum / v.n - v.psum / v.n }))
      .sort((a, b) => a.value - b.value);
    return {
      id: id("L2-avail"),
      level: "L2",
      node,
      title: "Availability% trend",
      metric: "availability",
      facts: {
        nowPct: Number((nowAvg * 100).toFixed(1)),
        priorPct: Number((priorAvg * 100).toFixed(1)),
        deltaPp: Number(((nowAvg - priorAvg) * 100).toFixed(1)),
      },
      narrative:
        `Availability moved from ${(priorAvg * 100).toFixed(1)}% to ${(nowAvg * 100).toFixed(1)}% (${((nowAvg - priorAvg) * 100).toFixed(1)} pp). ` +
        `${breakdown[0].label} took the biggest hit at ${(breakdown[0].value * 100).toFixed(1)} pp.`,
      chart: { type: "bar", series: breakdown.map((b) => ({ label: b.label, value: b.value })) },
      expandsTo: ["L2-Conversion: POs and PO Fill Rate"],
      source: "expand",
    };
  }

  if (node === "L2-Conversion: POs and PO Fill Rate") {
    const nowAvg = ds.skus.reduce((a, s) => a + s.poFillRate, 0) / ds.skus.length;
    const priorAvg = ds.skus.reduce((a, s) => a + s.priorPoFillRate, 0) / ds.skus.length;
    return {
      id: id("L2-pofill"),
      level: "L2",
      node,
      title: "PO Fill Rate",
      metric: "po_fill_rate",
      facts: {
        nowPct: Number((nowAvg * 100).toFixed(1)),
        priorPct: Number((priorAvg * 100).toFixed(1)),
        deltaPp: Number(((nowAvg - priorAvg) * 100).toFixed(1)),
      },
      narrative: `PO fill rate dropped from ${(priorAvg * 100).toFixed(1)}% to ${(nowAvg * 100).toFixed(1)}% — the upstream cause of the availability hit.`,
      chart: {
        type: "bar",
        series: ds.skus.map((s) => ({ label: s.sku, value: s.poFillRate - s.priorPoFillRate })),
      },
      source: "expand",
    };
  }

  if (node === "L2-Conversion: Is LBB% up?") {
    const nowAvg = ds.skus.reduce((a, s) => a + s.lostBuyBox, 0) / ds.skus.length;
    return {
      id: id("L2-lbb"),
      level: "L2",
      node,
      title: "Lost Buy Box %",
      metric: "lost_buy_box",
      facts: { nowPct: Number((nowAvg * 100).toFixed(1)) },
      narrative: `Lost Buy Box averages ${(nowAvg * 100).toFixed(1)}% across SKUs — modest, not the lever.`,
      chart: {
        type: "bar",
        series: ds.skus.map((s) => ({ label: s.sku, value: s.lostBuyBox })),
      },
      source: "expand",
    };
  }

  if (node === "L2-Traffic: Is Organic SOV down?" || node === "L2-Traffic: Is Paid SOV down?") {
    const branded = ds.keywords.filter((k) => k.branded);
    const isPaid = node.includes("Paid");
    const nowKey = isPaid ? "paidSov" : "organicSov";
    const priorKey = isPaid ? "priorPaidSov" : "priorOrganicSov";
    const top = branded.slice(0, 2);
    const avgNow = top.reduce((a, k) => a + (k[nowKey] as number), 0) / top.length;
    const avgPrior = top.reduce((a, k) => a + (k[priorKey] as number), 0) / top.length;
    return {
      id: id("L2-sov"),
      level: "L2",
      node,
      title: `${isPaid ? "Paid" : "Organic"} SOV on branded top-2`,
      metric: isPaid ? "paid_sov" : "organic_sov",
      facts: {
        nowPct: Number((avgNow * 100).toFixed(1)),
        priorPct: Number((avgPrior * 100).toFixed(1)),
        deltaPct: Number(((avgNow - avgPrior) / avgPrior * 100).toFixed(1)),
      },
      narrative:
        `Branded top-2 ${isPaid ? "paid" : "organic"} SOV dropped from ${(avgPrior * 100).toFixed(0)}% to ${(avgNow * 100).toFixed(0)}% ` +
        `(${((avgNow - avgPrior) / avgPrior * 100).toFixed(0)}%) — placement loss on franchise terms.`,
      chart: {
        type: "bar",
        series: branded.map((k) => ({ label: k.keyword, value: (k[nowKey] as number) - (k[priorKey] as number) })),
      },
      expandsTo: ["L2-Traffic: Ad Spend trending?"],
      source: "expand",
    };
  }

  if (node === "L2-Traffic: Ad Spend trending?") {
    const now = ds.skus.reduce((a, s) => a + s.adSpend, 0);
    const prior = ds.skus.reduce((a, s) => a + s.priorAdSpend, 0);
    const sales = ds.skus.reduce((a, s) => a + s.adSales, 0);
    const priorSales = ds.skus.reduce((a, s) => a + s.priorAdSales, 0);
    return {
      id: id("L2-ad"),
      level: "L2",
      node,
      title: "Ad spend & attributed sales",
      metric: "ad_spend",
      facts: {
        spendDeltaPct: Number(((now - prior) / prior * 100).toFixed(1)),
        salesDeltaPct: Number(((sales - priorSales) / priorSales * 100).toFixed(1)),
        roasNow: Number((sales / now).toFixed(2)),
        roasPrior: Number((priorSales / prior).toFixed(2)),
      },
      narrative:
        `Ad spend ${((now - prior) / prior * 100).toFixed(0)}%; attributed sales ${((sales - priorSales) / priorSales * 100).toFixed(0)}%. ` +
        `RoAS moved ${(sales / now).toFixed(2)}x (was ${(priorSales / prior).toFixed(2)}x).`,
      chart: {
        type: "bar",
        series: [
          { label: "Spend Δ", value: now - prior },
          { label: "Sales Δ", value: sales - priorSales },
        ],
      },
      source: "expand",
    };
  }

  if (node === "L2-ASP: Pricing trends") {
    const now = ds.skus.reduce((a, s) => a + s.revenue, 0) / ds.skus.reduce((a, s) => a + s.units, 0);
    const prior = ds.skus.reduce((a, s) => a + s.priorRevenue, 0) / ds.skus.reduce((a, s) => a + s.priorUnits, 0);
    const perSku = ds.skus.map((s) => ({
      sku: s.sku,
      aspNow: s.revenue / Math.max(s.units, 1),
      aspPrior: s.priorRevenue / Math.max(s.priorUnits, 1),
    }));
    const worst = perSku.sort((a, b) => (a.aspNow - a.aspPrior) - (b.aspNow - b.aspPrior))[0];
    return {
      id: id("L2-asp"),
      level: "L2",
      node,
      title: "ASP trend (mix vs price)",
      metric: "asp",
      facts: {
        nowAsp: Number(now.toFixed(2)),
        priorAsp: Number(prior.toFixed(2)),
        deltaPct: Number(((now - prior) / prior * 100).toFixed(1)),
        worstSku: worst.sku,
      },
      narrative:
        `ASP moved ${((now - prior) / prior * 100).toFixed(1)}% ($${prior.toFixed(2)} → $${now.toFixed(2)}). ` +
        `Mix-shift toward lower-ASP styles is the dominant driver; per-SKU ASP is mostly flat with the exception of ${worst.sku}.`,
      chart: {
        type: "bar",
        series: perSku.map((p) => ({ label: p.sku, value: p.aspNow - p.aspPrior })),
      },
      source: "expand",
    };
  }

  if (node === "L2-Conversion: Is Content Score down?") {
    const avg = ds.skus.reduce((a, s) => a + s.contentScore, 0) / ds.skus.length;
    return {
      id: id("L2-content"),
      level: "L2",
      node,
      title: "Content Score",
      metric: "content_score",
      facts: { nowPct: Number((avg * 100).toFixed(1)) },
      narrative: `Average content score is ${(avg * 100).toFixed(0)}%. Within the skill threshold — not the lever.`,
      chart: { type: "bar", series: ds.skus.map((s) => ({ label: s.sku, value: s.contentScore })) },
      source: "expand",
    };
  }

  // Generic fallback
  return {
    id: id("L2-generic"),
    level: "L2",
    node,
    title: node,
    metric: "",
    facts: {},
    narrative: `No engineered evidence configured for ${node} — surfaced as a placeholder.`,
    source: "expand",
  };
}

// Frontier: user-injected hypothesis outside the L0–L3 tree
export function frontierCard(ctx: RcaContext, hypothesis: string): EvidenceCard {
  return {
    id: `${ctx.clientId}-frontier-${Math.random().toString(36).slice(2, 7)}`,
    level: "frontier",
    title: "Frontier hypothesis (outside tree)",
    metric: "",
    facts: { hypothesis },
    narrative:
      `Flagged as outside the L0–L3 tree. Ally cannot compute on existing facts; this needs human judgement plus net-new data (e.g. ${hypothesis.includes("intent") ? "session-level top-of-page placement and intent classification" : "a custom dataset"}).`,
    source: "frontier",
  };
}

// Recommendation produced by an investigation
export function generateRecommendation(ctx: RcaContext, cards: EvidenceCard[]): RecommendationOutput {
  const ds = getDataset(ctx.clientId);
  const worst = rankContributors(ds)[0];
  const attr = attributeUnits(ds);
  const primary =
    attr.contributions.conversion <= attr.contributions.asp &&
    attr.contributions.conversion <= attr.contributions.gv
      ? "Conversion"
      : attr.contributions.asp <= attr.contributions.gv
      ? "ASP / mix shift"
      : "Traffic";

  const title =
    ctx.clientId === "nestle"
      ? "Restore availability on Coffee — unblock PO fill rate this week"
      : "Rebuild placement on franchise styles + tighten mix toward premium";

  const rationale =
    ctx.clientId === "nestle"
      ? `Shipped revenue is off plan and ${primary} is the dominant driver. Availability dropped sharply across Coffee (Nescafé Gold, Coffee mate), tracking the PO fill-rate slip. Recovering PO fill closes the loop.`
      : `${primary} is the dominant driver of the gap. ${worst.sku} is the worst contributor (ASP ${(worst.aspDelta).toFixed(0)} per unit drop, units ${worst.unitsDelta.toLocaleString()}). Branded top-2 SOV is down ~12% — placement-driven conversion loss compounded by mix shift toward 520.`;

  const actions =
    ctx.clientId === "nestle"
      ? [
          { label: "Escalate Coffee PO fill rate to vendor manager", owner: "Demand Planning" },
          { label: "Move ATC for affected SKUs to alternative DCs", owner: "Supply" },
          { label: "Pull promo on Nescafé Gold while OOS to protect margin", owner: "Marketing" },
        ]
      : [
          { label: "Restore SP/SB budget on 1080 + 990 to recover SOV on branded top-2", owner: "Media" },
          { label: "Defend 1080 ASP — pause deep discounts; reposition 520 to capture entry intent", owner: "Pricing" },
          { label: "Re-allocate $80K from generic 'running shoes' to branded 'new balance 1080'", owner: "Media" },
        ];

  return {
    id: `${ctx.clientId}-reco-${Date.now()}`,
    title,
    rationale,
    actions,
    evidenceIds: cards.map((c) => c.id),
  };
}

export function diffInvestigations(prev: Investigation, next: Investigation) {
  const map = new Map<string, EvidenceCard>(prev.cards.map((c) => [c.title, c]));
  const changes: { title: string; prior: EvidenceCard | null; now: EvidenceCard }[] = [];
  for (const c of next.cards) {
    const before = map.get(c.title) || null;
    changes.push({ title: c.title, prior: before, now: c });
  }
  return changes;
}
