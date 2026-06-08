import { NextRequest, NextResponse } from "next/server";
import { resolveIntent, describeIntent } from "@/lib/semantic/intent";
import { compute } from "@/lib/semantic/compute";
import { buildSystemPrompt } from "@/lib/ally/systemPrompt";
import { scriptedReply, frontierReply } from "@/lib/ally/fallback";
import { newBalanceSkill } from "@/lib/skills/newbalance";
import { nestleSkill } from "@/lib/skills/nestle";
import type { SkillFile } from "@/lib/skills/types";

const defaultSkills: Record<string, SkillFile> = {
  "new-balance": newBalanceSkill,
  "nestle": nestleSkill,
};

type Body = {
  question: string;
  clientId: string;
  skill?: SkillFile;
  frontierHypothesis?: string;
  knowledge?: string[];
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientId = body.clientId || "new-balance";
  const skill = body.skill || defaultSkills[clientId];
  const knowledge = body.knowledge ?? skill.customContext;

  // Frontier short-circuit
  if (body.frontierHypothesis) {
    const f = frontierReply(body.frontierHypothesis);
    return NextResponse.json({ ...f, frontierFlag: true });
  }

  // Resolve intent + compute deterministically
  const intent = resolveIntent(body.question, skill);
  const intentLabel = describeIntent(intent);
  const result = compute(intent, clientId);

  const computedFacts = {
    intent,
    intentLabel,
    total: result.total,
    prior: result.prior,
    comparisonDelta: result.comparisonDelta,
    rows: result.rows.slice(0, 25),
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const system = buildSystemPrompt(skill, knowledge);
      const userMsg = JSON.stringify({
        question: body.question,
        computedFacts,
      });
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          system,
          messages: [{ role: "user", content: userMsg }],
        }),
      });
      clearTimeout(timeout);
      if (r.ok) {
        const j = await r.json();
        const text = j?.content?.[0]?.text ?? "";
        return NextResponse.json({
          reply: text,
          resolvedIntent: intent,
          intentLabel,
          result,
          source: "live",
        });
      }
    } catch {
      // fall through to scripted
    }
  }

  const scripted = scriptedReply({
    question: body.question,
    clientId,
    skill,
    intentLabel,
    result,
  });
  return NextResponse.json({
    ...scripted,
    resolvedIntent: intent,
    intentLabel,
    result,
    source: apiKey ? "fallback-after-error" : "scripted",
  });
}
