#!/usr/bin/env tsx
/**
 * Smoke test for the semantic engine + RCA engine.
 * Run: npm test
 * Verifies New Balance numbers land near §11 demo targets.
 */
import { compute, format, formatDelta } from "@/lib/semantic/compute";
import { resolveIntent, describeIntent } from "@/lib/semantic/intent";
import { newBalanceSkill } from "@/lib/skills/newbalance";
import { nestleSkill } from "@/lib/skills/nestle";
import { runFirstPass, attributeUnits, rankContributors } from "@/lib/rca/engine";
import { getDataset } from "@/lib/data";

let failed = 0;
function check(label: string, actual: any, predicate: (v: any) => boolean) {
  const ok = predicate(actual);
  console.log(`${ok ? "✅" : "❌"} ${label}  →  ${JSON.stringify(actual)}`);
  if (!ok) failed++;
}

// ── New Balance ──
const nbDs = getDataset("new-balance");
const attr = attributeUnits(nbDs);
console.log("\nNew Balance attribution:");
check("Δ units in [-12%, -5%] (target -8%)", attr.unitsPct, (v) => v <= -0.05 && v >= -0.12);
check("Δ ASP in [-12%, -6%] (target -8%)", attr.aspPct, (v) => v <= -0.06 && v >= -0.12);
check("Δ GV positive ~+11%", attr.gvPct, (v) => v > 0.05 && v < 0.18);
check("Δ Conversion negative (3.5% → 2.9%-ish)", attr.cvrPct, (v) => v < -0.10);
check("Conversion contribution is most negative", attr.contributions, (c: any) => c.conversion < c.asp && c.conversion < c.gv);

const ranked = rankContributors(nbDs);
check("1080v13 is worst SKU contributor", ranked[0].sku, (v) => v === "1080v13");
check("520v8 units +100% or more", ranked.find((r) => r.sku === "520v8")?.unitsDelta, (v) => v >= 12_000);
check("ad spend ≈ -19%", nbDs.skus.reduce((a, s) => a + (s.adSpend - s.priorAdSpend), 0) / nbDs.skus.reduce((a, s) => a + s.priorAdSpend, 0), (v) => v < -0.10 && v > -0.30);
check("ad sales ≈ -30%", nbDs.skus.reduce((a, s) => a + (s.adSales - s.priorAdSales), 0) / nbDs.skus.reduce((a, s) => a + s.priorAdSales, 0), (v) => v < -0.18 && v > -0.40);
check("branded top-2 organic SOV ≈ -12%", (() => {
  const top2 = nbDs.keywords.filter((k) => k.branded).slice(0, 2);
  const now = top2.reduce((a, k) => a + k.organicSov, 0) / 2;
  const prior = top2.reduce((a, k) => a + k.priorOrganicSov, 0) / 2;
  return (now - prior) / prior;
})(), (v) => v < -0.08 && v > -0.20);

// ── Chat intent resolution ──
const i1 = resolveIntent("how are sales tracking vs plan?", newBalanceSkill);
console.log("\nIntent for NB ‘sales tracking vs plan’:", describeIntent(i1));
check("Resolves to ordered_revenue", i1.metricId, (v) => v === "ordered_revenue");
check("Resolves to vsPlan comparison", i1.comparison, (v) => v === "vsPlan");

const r1 = compute(i1, "new-balance");
console.log("Top-line revenue:", format(r1.total, "currency"), "vs prior", format(r1.prior, "currency"), "Δ", formatDelta(r1.comparisonDelta.pct));
check("Revenue decline 10–25%", r1.comparisonDelta.pct, (v) => v < -0.10 && v > -0.25);

// ── First pass ──
const fp = runFirstPass({ clientId: "new-balance", metricId: "ordered_revenue", skill: newBalanceSkill });
check("First pass yields >=3 cards", fp.cards.length, (v) => v >= 3);
check("Primary suspect = conversion", fp.primarySuspect, (v) => v === "conversion");

// ── Nestlé reshape ──
const fpN = runFirstPass({ clientId: "nestle", metricId: "shipped_revenue", skill: nestleSkill });
check("Nestlé first pass uses shipped_revenue", fpN.context.metricId, (v) => v === "shipped_revenue");
const availCard = fpN.cards.find((c) => c.node === "L1: Revenue attribution (Traffic × Conversion × ASP)");
check("Nestlé L1 narrative mentions conversion", availCard?.narrative.toLowerCase(), (v: string | undefined) => !!v && v.includes("conversion"));

console.log(`\n${failed === 0 ? "🎉 all checks passed" : `❌ ${failed} check(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
