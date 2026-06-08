"use client";
import type { SkillFile } from "@/lib/skills/types";
import type { ComputeResult, SemanticIntent } from "@/lib/semantic/types";

export type AllyApiResponse = {
  reply: string;
  resolvedIntent: SemanticIntent;
  intentLabel: string;
  result: ComputeResult;
  proposedBranch?: string;
  frontierFlag?: boolean;
  source?: string;
};

export async function askAlly(args: {
  question: string;
  clientId: string;
  skill?: SkillFile;
  frontierHypothesis?: string;
}): Promise<AllyApiResponse> {
  const r = await fetch("/api/ally", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`Ally route failed (${r.status})`);
  return (await r.json()) as AllyApiResponse;
}
