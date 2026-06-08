"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AllyMessage, { AllyAnswer } from "@/components/AllyMessage";
import SuggestedPrompts from "@/components/SuggestedPrompts";
import ChatInput from "@/components/ChatInput";
import { askAlly } from "@/lib/ally/client";
import {
  useClient,
  useDashboards,
  useGoldenQueries,
  useSkill,
} from "@/lib/state/store";

export default function ChatPage() {
  const [client] = useClient();
  const { skill } = useSkill(client);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AllyAnswer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addWidgetIntent, setAddWidgetIntent] = useState(false);
  const dashboards = useDashboards(client);
  const golden = useGoldenQueries(client);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const res = await askAlly({ question, clientId: client, skill });
        const ans: AllyAnswer = {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          question,
          intent: res.resolvedIntent,
          intentLabel: res.intentLabel,
          result: res.result,
          reply: res.reply,
          proposedBranch: res.proposedBranch,
          frontierFlag: res.frontierFlag,
          source: res.source,
        };
        setAnswers((prev) => [...prev, ans]);
        setQ("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [client, skill],
  );

  useEffect(() => setAnswers([]), [client]);

  // Scroll to bottom when new answer arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answers, loading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("q");
    if (incoming) ask(incoming);
    if (params.get("intent") === "add-widget") setAddWidgetIntent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pin = (a: AllyAnswer) => {
    const id = `db-${client}-pins`;
    const existing = dashboards.list.find((d) => d.id === id) || {
      id,
      clientId: client,
      name: "Pinned from Chat",
      widgets: [],
      prebuilt: false,
    };
    existing.widgets.push({
      id: `w-${Date.now()}`,
      title: a.intentLabel,
      intent: a.intent,
      chartType: a.result.chartSpec.type,
      size: "md",
      source: "chat",
    });
    dashboards.upsert(existing);
    alert("Pinned to dashboard “Pinned from Chat”");
  };

  const saveAsNewDashboard = (a: AllyAnswer) => {
    const id = `personal-${client}-${Date.now()}`;
    dashboards.upsert({
      id,
      clientId: client,
      name: a.intentLabel || "New dashboard",
      description: `Generated from chat · "${a.question}"`,
      widgets: [
        {
          id: `${id}-w0`,
          title: a.intentLabel,
          intent: a.intent,
          chartType: a.result.chartSpec.type,
          size: "md",
          source: "chat",
        },
      ],
      prebuilt: false,
    });
    router.push(`/dashboards/${id}`);
  };

  const buildDashboardFromSelection = () => {
    if (selected.size < 1) return;
    const id = `personal-${client}-${Date.now()}`;
    const picked = answers.filter((a) => selected.has(a.id));
    dashboards.upsert({
      id,
      clientId: client,
      name: `Chat-built · ${new Date().toLocaleDateString()}`,
      description: `Generated from ${picked.length} answer(s) in Ask Ally.`,
      widgets: picked.map((a, i) => ({
        id: `${id}-w${i}`,
        title: a.intentLabel,
        intent: a.intent,
        chartType: a.result.chartSpec.type,
        size: i === 0 ? "lg" : "md",
        source: "chat",
      })),
      prebuilt: false,
    });
    router.push(`/dashboards/${id}`);
  };

  const save = (a: AllyAnswer) => {
    golden.add({
      id: `gq-${Date.now()}`,
      clientId: client,
      nl: a.question,
      intent: a.intent,
      uses: 1,
      tags: ["candidate"],
      reviewed: false,
    });
    alert("Saved as golden-query candidate. Review in Builder → Semantic.");
  };

  const goDeeper = (a: AllyAnswer) => {
    const id = `inv-${client}-${Date.now()}`;
    sessionStorage.setItem(`ally:seed:${id}`, JSON.stringify({
      clientId: client,
      metricId: a.intent.metricId,
      fromQuestion: a.question,
    }));
    router.push(`/workflows/rca/${id}`);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-white overflow-hidden">
      {/* Inner Chat Sidebar */}
      <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg)] p-4 flex flex-col gap-5 overflow-y-auto hidden lg:flex">
        <div className="flex items-center justify-between text-[var(--fg)]">
          <span className="font-semibold text-sm">Ask AI</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </div>

        <button 
          onClick={() => { setAnswers([]); setQ(""); }}
          className="flex items-center gap-2 text-sm text-[var(--violet-700)] font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          New Chat
        </button>

        <div className="flex flex-col gap-3 flex-1 mt-2">
          <div className="flex items-center border-b border-[var(--border)] text-[12px] font-semibold">
            <button className="px-1 py-2 text-[var(--fg)] border-b-2 border-[var(--violet-600)] flex-1 text-center">Popular Prompts</button>
            <button className="px-1 py-2 text-[var(--fg-muted)] hover:text-[var(--fg)] flex-1 text-center">History</button>
          </div>

          <div className="flex gap-2">
            <span className="chip bg-[var(--violet-50)] text-[var(--violet-700)] border-[var(--violet-200)]">RCA (Ninja)</span>
            <span className="chip">RCA (Shark)</span>
          </div>

          <SuggestedPrompts clientId={client} onPick={ask} variant="sidebar" />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Optional Header for intent context */}
        {addWidgetIntent && (
          <div className="shrink-0 p-3 px-4 flex items-center gap-2 border-b border-[var(--violet-300)] bg-[var(--violet-50)] z-10">
            <div className="text-sm text-[var(--ciq-purple)]">
              <span className="font-semibold">Build a widget.</span> Ask Ally a question, then click <em>“Save as new dashboard”</em> or check the box and combine multiple answers below.
            </div>
            <button onClick={() => setAddWidgetIntent(false)} className="ml-auto chip bg-white hover:bg-gray-50">Dismiss</button>
          </div>
        )}
        
        {/* Selection Bar for "Build Dashboard" */}
        {selected.size > 0 && (
          <div className="shrink-0 p-2.5 px-4 flex items-center gap-2 text-[12px] bg-[var(--bg-subtle)] border-b border-[var(--border)] z-10">
            <span className="label-xs">Build dashboard:</span>
            <span className="text-[var(--fg-muted)]">
              {selected.size} answer{selected.size === 1 ? "" : "s"} selected
            </span>
            <button
              onClick={buildDashboardFromSelection}
              className="ml-auto btn btn-primary !py-1 !text-[12px]"
            >
              Build dashboard from selection
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scroll-thin p-4 md:p-8 flex flex-col gap-6">
          {answers.length === 0 && (
            <div className="m-auto text-center max-w-md space-y-4 pt-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--violet-500)] to-[var(--ciq-purple)] text-white grid place-items-center mx-auto shadow-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2.5l1.7 4.3 4.3 1.7-4.3 1.7L12 14.5l-1.7-4.3L6 8.5l4.3-1.7L12 2.5zM19 14l.9 2.1 2.1.9-2.1.9L19 20l-.9-2.1-2.1-.9 2.1-.9L19 14zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8L2.5 17.5l1.8-.7L5 15z" fill="currentColor" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[var(--fg)]">Ask Ally</h2>
              <p className="text-sm text-[var(--fg-muted)]">
                Ask anything about {client === "nestle" ? "Nestlé" : "New Balance"}. Ally resolves semantic intents and computes deterministically.
              </p>
              <div className="pt-4 lg:hidden">
                <SuggestedPrompts clientId={client} onPick={ask} />
              </div>
            </div>
          )}

          {answers.map((a) => (
            <div key={a.id} className="space-y-6">
              {/* User Bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] md:max-w-[70%]">
                  <div className="bg-[var(--violet-50)] text-[var(--violet-900)] rounded-2xl rounded-tr-sm px-4 py-3 text-[14px] shadow-sm border border-[var(--violet-100)] inline-block w-full">
                    {a.question}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 justify-end">
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)] cursor-pointer hover:text-[var(--fg)] transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="accent-[var(--violet-600)]"
                      />
                      Include in new dashboard
                    </label>
                    <span className="text-[10px] text-[var(--fg-muted)] uppercase tracking-wider">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ally Bubble */}
              <div className="flex justify-start">
                <div className="max-w-full lg:max-w-[85%] w-full">
                  <AllyMessage
                    answer={a}
                    onPin={() => pin(a)}
                    onSave={() => save(a)}
                    onSaveAsDashboard={() => saveAsNewDashboard(a)}
                    onGoDeeper={() => goDeeper(a)}
                  />
                </div>
              </div>
            </div>
          ))}

          {loading && (
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
              <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] text-red-700 max-w-[80%]">
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="shrink-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-4 md:px-8 z-10 w-full max-w-4xl mx-auto">
          <ChatInput
            value={q}
            onChange={setQ}
            onSubmit={ask}
            loading={loading}
            placeholder={`Ask about ${client === "nestle" ? "Nestlé" : "New Balance"}...`}
          />
        </div>
      </main>
    </div>
  );
}
