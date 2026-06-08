"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAlly } from "@/lib/ally/client";
import { useClient, useSkill } from "@/lib/state/store";
import AllyMessage, { AllyAnswer } from "./AllyMessage";
import SuggestedPrompts from "./SuggestedPrompts";
import ChatInput from "./ChatInput";

export type ChatDockSeed = {
  /** Optional prefilled question — if provided, the dock asks it on open. */
  question?: string;
  /** Context label shown above the input ("From widget: Share of Voice"). */
  contextLabel?: string;
  /** Optional prompt to drop into the input without auto-sending. */
  prefill?: string;
};

export default function ChatDock({
  open,
  onClose,
  seed,
}: {
  open: boolean;
  onClose: () => void;
  seed?: ChatDockSeed | null;
}) {
  const [client] = useClient();
  const { skill } = useSkill(client);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AllyAnswer | null>(null);
  const lastSeedKeyRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const res = await askAlly({ question, clientId: client, skill });
        setAnswer({
          id: `dock-${Date.now()}`,
          question,
          intent: res.resolvedIntent,
          intentLabel: res.intentLabel,
          result: res.result,
          reply: res.reply,
          proposedBranch: res.proposedBranch,
          frontierFlag: res.frontierFlag,
          source: res.source,
        });
        setQ("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [client, skill],
  );

  // Apply seed on open. If the seed carries a question, auto-ask it once.
  useEffect(() => {
    if (!open || !seed) return;
    const key = JSON.stringify(seed);
    if (lastSeedKeyRef.current === key) return;
    lastSeedKeyRef.current = key;
    if (seed.prefill) setQ(seed.prefill);
    if (seed.question) {
      setAnswer(null);
      void ask(seed.question);
    }
  }, [open, seed, ask]);

  // Reset the "already applied" key whenever the dock closes so a new open with the same seed re-runs.
  useEffect(() => {
    if (!open) lastSeedKeyRef.current = null;
  }, [open]);

  // Scroll to bottom when new answer arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer, loading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[32rem] max-w-[90vw] bg-[var(--bg-subtle)] border-l shadow-soft flex flex-col">
        <div className="h-12 border-b bg-white flex items-center px-4 shrink-0">
          <div className="font-semibold text-sm text-[var(--ciq-purple)] flex items-center gap-2">
            <SparkleIcon />
            Ask Ally
          </div>
          <button onClick={onClose} className="ml-auto text-xs text-[var(--ciq-ink-soft)] hover:text-[var(--fg)]">close</button>
        </div>
        {seed?.contextLabel && (
          <div className="px-4 py-2 border-b bg-[var(--violet-50)] text-[11px] text-[var(--violet-700)] flex items-center gap-1.5 shrink-0">
            <span className="label-xs !text-[var(--violet-700)]">Context</span>
            <span className="font-medium">{seed.contextLabel}</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-6 flex flex-col">
          {!answer && !loading && (
            <div className="m-auto text-center space-y-4 pt-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--violet-500)] to-[var(--ciq-purple)] text-white grid place-items-center mx-auto shadow-md">
                <SparkleIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[var(--fg)]">Ask Ally</h2>
              <div className="text-xs text-[var(--ciq-ink-soft)]">
                Available on every surface. Ask anything — Ally resolves it to a semantic intent and computes deterministically.
              </div>
              <div className="pt-4 flex justify-center">
                <SuggestedPrompts clientId={client} onPick={ask} />
              </div>
            </div>
          )}
          
          {answer && (
            <div className="space-y-6">
              {/* User Bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%]">
                  <div className="bg-[var(--violet-50)] text-[var(--violet-900)] rounded-2xl rounded-tr-sm px-4 py-3 text-[14px] shadow-sm border border-[var(--violet-100)] inline-block w-full">
                    {answer.question}
                  </div>
                  <div className="text-[10px] text-[var(--fg-muted)] uppercase tracking-wider mt-1 text-right">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Ally Bubble */}
              <div className="flex justify-start">
                <div className="max-w-[95%] w-full">
                  <AllyMessage
                    answer={answer}
                    onGoDeeper={() => {
                      const id = `inv-${client}-${Date.now()}`;
                      sessionStorage.setItem(`ally:seed:${id}`, JSON.stringify({
                        clientId: client,
                        metricId: answer.intent.metricId,
                        fromQuestion: answer.question,
                      }));
                      router.push(`/workflows/rca/${id}`);
                      onClose();
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {loading && !answer && (
            <div className="flex justify-start">
              <div className="bg-white border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[var(--violet-600)] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[var(--violet-600)] animate-bounce" style={{ animationDelay: "0.1s" }} />
                <span className="w-2 h-2 rounded-full bg-[var(--violet-600)] animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start">
              <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] text-red-700 max-w-[90%]">
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="shrink-0 bg-white border-t border-[var(--border)] pt-3 pb-3 px-4 z-10 w-full">
          <ChatInput
            value={q}
            onChange={setQ}
            onSubmit={ask}
            loading={loading}
            placeholder="Ask Ally…"
          />
        </div>
      </div>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5zM19 14l.9 2.1 2.1.9-2.1.9L19 20l-.9-2.1-2.1-.9 2.1-.9L19 14zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8L2.5 17.5l1.8-.7L5 15z"
        fill="currentColor"
        color="var(--violet-600)"
      />
    </svg>
  );
}
