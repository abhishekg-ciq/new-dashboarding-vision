import type { SkillFile } from "@/lib/skills/types";
import type { ComputeResult } from "@/lib/semantic/types";

/**
 * Scripted fallback for /api/ally when ANTHROPIC_API_KEY is missing or the
 * upstream call fails. Keyed to §11 demo scenarios for NB + Nestlé.
 */

export type AllyReply = {
  reply: string;
  proposedBranch?: string;
  frontierFlag?: boolean;
};

function pct(v: number) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(1)}%`;
}

function money(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${v < 0 ? "-" : ""}$${Math.abs(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${v < 0 ? "-" : ""}$${Math.abs(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function scriptedReply(args: {
  question: string;
  clientId: string;
  skill: SkillFile;
  intentLabel: string;
  result: ComputeResult;
}): AllyReply {
  const { question, clientId, skill, intentLabel, result } = args;
  const q = question.toLowerCase();
  const delta = result.comparisonDelta.pct;
  const total = result.total;
  const direction = delta < 0 ? "below" : "above";

  // Top-line tracking
  if (q.includes("track") || q.includes("vs plan") || q.includes("how are sales") || q.includes("how is")) {
    return {
      reply:
        clientId === "new-balance"
          ? `${intentLabel}: ${money(total)} ${direction} prior at ${pct(delta)}. The trend chart shows the dip concentrated in the back half of the window. Per the New Balance skill (conversion-first), the most likely driver is conversion — branded top-2 SOV is down ~12% and the 1080 franchise is taking the biggest hit.`
          : `${intentLabel}: ${money(total)} (${pct(delta)} PvP). For Nestlé, the first thing to check is availability — when shipped revenue dips at this magnitude, PO fill rate is usually the upstream cause. The trend shows a mid-period trough consistent with an OOS event.`,
      proposedBranch:
        clientId === "new-balance"
          ? "L2-Traffic: Is Organic SOV down?"
          : "L2-Conversion: Is Availability% down?",
    };
  }

  // "Why" question — conversion / placement
  if (q.includes("why") && (q.includes("conversion") || q.includes("convert"))) {
    return {
      reply:
        clientId === "new-balance"
          ? `Per the L1 identity, conversion is the dominant contributor to the gap (more negative than GV or ASP). On branded top-2 keywords (new balance 1080, new balance 990) organic SOV moved from ~61% → ~54% (-12%). That maps to a placement loss on the franchise terms, which directly depresses conversion despite +11% glance views.`
          : `Conversion fell because availability did. Coffee dropped from 96%→84% (-12pp) and Nutrition from 95%→83% (-12pp). PO fill rate slipped from 88%→74% the previous fortnight — the upstream cause.`,
      proposedBranch:
        clientId === "new-balance"
          ? "L2-Traffic: Ad Spend trending?"
          : "L2-Conversion: POs and PO Fill Rate",
    };
  }

  if (q.includes("why")) {
    return {
      reply:
        clientId === "new-balance"
          ? `Working the L1 → L2 path under the NB skill (conversion-first): the biggest negative contribution comes from conversion. Branded top-2 organic SOV is down ~12%, paid SOV is down on the same terms, and ad spend has been cut ~19% — placement-led conversion loss. ASP is down too, but that's mix-shift to 520, not per-SKU markdown (except 1080).`
          : `Conversion is the dominant lever for Nestlé this period — units are down well ahead of glance views. Availability slipped sharply on Coffee and Nutrition, and PO fill rate is the upstream cause.`,
      proposedBranch:
        clientId === "new-balance"
          ? "L2-Traffic: Is Organic SOV down?"
          : "L2-Conversion: Is Availability% down?",
    };
  }

  // Pin / save / generic
  return {
    reply:
      `Resolved: ${intentLabel}. Result: ${money(total)} (${pct(delta)} vs prior). ` +
      `This is computed deterministically from the seeded ${args.clientId === "new-balance" ? "New Balance" : "Nestlé"} dataset. ` +
      `You can pin this widget, save the question to the golden-query bank, or go deeper to start an RCA workflow.`,
  };
}

// "Frontier" hypothesis test response — used in §11.4
export function frontierReply(hypothesis: string): AllyReply {
  return {
    reply:
      `That hypothesis is outside the L0–L3 tree, so I can't compute it against the existing facts. ` +
      `To test "${hypothesis}", we'd need session-level top-of-page placement traces plus intent classification on the query — neither of which is wired into the semantic engine today. I've flagged it as a frontier card on the canvas so a human can take it from here.`,
    frontierFlag: true,
  };
}
