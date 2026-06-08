"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotifications, usePersona, type Persona } from "@/lib/state/store";
import ChatDock, { type ChatDockSeed } from "./ChatDock";

const clientNav = [
  { href: "/", label: "Pulse" },
  { href: "/chat", label: "Ask Ally" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/alerts", label: "Alerts" },
  { href: "/workflows", label: "Workflows" },
  { href: "/recommendations", label: "Recommendations" },
];

const builderNav = [
  { href: "/builder/data", label: "Data & Domain" },
  { href: "/builder/semantic", label: "Semantic / Context" },
  { href: "/builder/skills", label: "Skills" },
  { href: "/builder/workflows", label: "Workflows" },
];

const PERSONAS: { id: Persona; label: string; sub: string }[] = [
  { id: "end-user", label: "End User", sub: "Brand client" },
  { id: "csm", label: "CSM / PM", sub: "Internal" },
  { id: "fde", label: "FDE", sub: "Engineer" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { list: notifications } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const [dockOpen, setDockOpen] = useState(false);
  const [dockSeed, setDockSeed] = useState<ChatDockSeed | null>(null);
  const [persona, setPersona] = usePersona();

  const insideBuilder = pathname?.startsWith("/builder");
  const [builderOpen, setBuilderOpen] = useState<boolean>(Boolean(insideBuilder));
  useEffect(() => {
    if (insideBuilder) setBuilderOpen(true);
  }, [insideBuilder]);

  // Any surface (dashboards, widgets, alerts...) can open the dock by dispatching
  // window.dispatchEvent(new CustomEvent("ally:open-dock", { detail: <seed> }))
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ChatDockSeed | undefined>).detail;
      setDockSeed(detail ?? null);
      setDockOpen(true);
    };
    window.addEventListener("ally:open-dock", handler);
    return () => window.removeEventListener("ally:open-dock", handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-subtle)]">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="h-14 flex items-center px-5 gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[var(--violet-600)] grid place-items-center text-white text-[12px] font-bold">A</div>
            <div className="text-[15px] font-semibold tracking-tight text-[var(--fg)]">Ally</div>
            <div className="hidden md:block text-[11px] text-[var(--fg-muted)] ml-1">CommerceIQ · Nestlé</div>
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            <div
              className="hidden md:flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] p-0.5 text-[12px]"
              role="group"
              aria-label="Persona"
              title="Switch persona view"
            >
              {PERSONAS.map((p) => {
                const active = persona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`h-7 px-2.5 rounded-[5px] transition font-medium ${
                      active
                        ? "bg-[var(--violet-600)] text-white shadow-[var(--shadow-xs)]"
                        : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* SIDE NAV */}
        <aside className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--bg)] p-3 hidden md:flex flex-col gap-0.5">
          <div className="eyebrow px-2 mb-1.5">Consume</div>
          {clientNav.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-2 rounded-md text-sm transition ${
                  active
                    ? "bg-[var(--violet-50)] text-[var(--violet-700)] font-semibold"
                    : "text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}

          <div className="my-2 h-px bg-[var(--border)]" />

          <button
            onClick={() => setBuilderOpen((v) => !v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition ${
              insideBuilder
                ? "bg-[var(--violet-50)] text-[var(--violet-700)] font-semibold"
                : "text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)]"
            }`}
            aria-expanded={builderOpen}
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Builder
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${builderOpen ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {builderOpen && (
            <div className="ml-2 pl-2 border-l border-[var(--border)] mt-1 flex flex-col gap-0.5">
              {builderNav.map((n) => {
                const active = pathname?.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`px-3 py-1.5 rounded-md text-sm transition ${
                      active
                        ? "bg-[var(--violet-50)] text-[var(--violet-700)] font-semibold"
                        : "text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-auto rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-[12px] leading-snug text-[var(--fg-muted)]">
            <div className="font-semibold text-[var(--fg)] mb-1">One semantic engine</div>
            Dashboards, Workflows, and Chat all read from the same registry + deterministic compute. Ally narrates; the engine does math.
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      <ChatDock
        open={dockOpen}
        seed={dockSeed}
        onClose={() => {
          setDockOpen(false);
          setDockSeed(null);
        }}
      />
    </div>
  );
}
