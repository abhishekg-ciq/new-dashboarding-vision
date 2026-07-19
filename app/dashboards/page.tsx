"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { prebuiltDashboards } from "@/lib/dashboards/prebuilt";
import { forClient, useAuthoredDashboards, useClient, useDashboards, usePersona } from "@/lib/state/store";

type CardKind = "prebuilt" | "personal";

export default function DashboardsIndex() {
  const [client] = useClient();
  const [persona] = usePersona();
  const router = useRouter();
  const { list: authoredAll } = useAuthoredDashboards();
  const authored = forClient(authoredAll, client);
  const prebuilt = [
    ...(prebuiltDashboards[client] || []),
    ...authored.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      status: "functional" as const,
      category: "standard" as const,
      widgets: a.widgets,
    })),
  ];
  const { list: pinned, upsert, remove } = useDashboards(client);

  const [createOpen, setCreateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const standardDashboards = prebuilt.filter((d) => d.category !== "custom");
  const customDashboards   = prebuilt.filter((d) => d.category === "custom");

  function clone(id: string, kind: CardKind) {
    const src =
      kind === "prebuilt"
        ? prebuilt.find((d) => d.id === id)
        : pinned.find((d) => d.id === id);
    if (!src) return;
    const newId = `personal-${client}-${Date.now()}`;
    upsert({
      id: newId,
      name: kind === "prebuilt" ? `${src.name} — my copy` : `${src.name} — copy`,
      description: (src as any).description || "",
      widgets: (src.widgets || []).map((w: any) => ({ ...w, id: `${newId}-${w.id}` })),
    });
    router.push(`/dashboards/${newId}`);
  }

  function deletePersonal(id: string) {
    if (!confirm("Delete this personal dashboard?")) return;
    remove(id);
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex items-start gap-3">
        <h1 className="text-2xl font-semibold text-[var(--ciq-purple)]">Dashboards</h1>
        {persona === "end-user" && (
          <div className="ml-auto relative">
            <button
              onClick={() => setCreateOpen((v) => !v)}
              className="btn btn-primary !py-1.5 !text-[13px] whitespace-nowrap"
            >
              + Create new
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-80">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {createOpen && (
              <CreateNewMenu
                onAskAlly={() => { setCreateOpen(false); router.push("/chat?intent=add-widget"); }}
                onTemplates={() => { setCreateOpen(false); setTemplatesOpen(true); }}
                onClose={() => setCreateOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Section 1: Standard ─────────────────────────────────────────── */}
      <Section
        icon={<GridIcon />}
        title="Standard"
        badge={standardDashboards.length}
        description="Out-of-the-box dashboards available to everyone."
      >
        <div className="grid md:grid-cols-2 gap-3">
          {standardDashboards.map((d) => (
            <DashboardCard
              key={d.id}
              id={d.id}
              kind="prebuilt"
              name={d.name}
              description={d.description}
              widgetCount={d.widgets.length}
              onClone={() => clone(d.id, "prebuilt")}
              canDelete={false}
            />
          ))}
        </div>
      </Section>

      {/* ── Section 2: Custom ───────────────────────────────────────────── */}
      <Section
        icon={<LockIcon />}
        title="Custom"
        badge={customDashboards.length}
        description="Tailored and customized for your business. View-only."
        badgeColor="amber"
      >
        {customDashboards.length === 0 ? (
          <EmptyState message="No custom dashboards have been configured for your account yet. Contact your FDE to get one built." />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {customDashboards.map((d) => (
              <DashboardCard
                key={d.id}
                id={d.id}
                kind="prebuilt"
                name={d.name}
                description={d.description}
                widgetCount={d.widgets.length}
                isCustom
                onClone={() => {}}
                canDelete={false}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Section 3: Personal ─────────────────────────────────────────── */}
      <Section
        icon={<PersonIcon />}
        title="Personal"
        badge={pinned.length}
        description="Dashboards you've saved, cloned, or built via Ask Ally."
      >
        {pinned.length === 0 ? (
          <EmptyState message="You haven't saved any personal dashboards yet. Clone a standard template or create one via Ask Ally." />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {pinned.map((d) => (
              <DashboardCard
                key={d.id}
                id={d.id}
                kind="personal"
                name={d.name}
                description={d.description || `${d.widgets.length} widget(s)`}
                widgetCount={d.widgets.length}
                isPersonal
                onClone={() => clone(d.id, "personal")}
                onDelete={() => deletePersonal(d.id)}
                canDelete
              />
            ))}
          </div>
        )}
      </Section>

      {templatesOpen && (
        <TemplatesModal
          templates={standardDashboards}
          onPick={(id) => { setTemplatesOpen(false); clone(id, "prebuilt"); }}
          onClose={() => setTemplatesOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon,
  title,
  badge,
  badgeColor = "violet",
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: number;
  badgeColor?: "violet" | "amber";
  description: string;
  children: React.ReactNode;
}) {
  const badgeClasses =
    badgeColor === "amber"
      ? "bg-amber-100 text-amber-700"
      : "bg-[var(--violet-100)] text-[var(--violet-700)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border)]">
        <span className="text-[var(--fg-muted)]">{icon}</span>
        <span className="text-sm font-semibold text-[var(--fg)]">{title}</span>
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${badgeClasses}`}>
          {badge}
        </span>
        <span className="text-[12px] text-[var(--fg-muted)] ml-1">{description}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-8 text-center">
      <p className="text-sm text-[var(--fg-muted)]">{message}</p>
    </div>
  );
}

// ─── Dashboard card ───────────────────────────────────────────────────────────
function DashboardCard({
  id,
  kind,
  name,
  description,
  widgetCount,
  isPersonal,
  isCustom,
  onClone,
  onDelete,
  canDelete,
}: {
  id: string;
  kind: CardKind;
  name: string;
  description: string;
  widgetCount: number;
  isPersonal?: boolean;
  isCustom?: boolean;
  onClone: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div className={`card p-4 flex flex-col gap-2 transition group relative ${
      isCustom
        ? "hover:border-amber-300 border-amber-200 bg-amber-50/30"
        : "hover:border-[var(--ciq-accent)]"
    }`}>
      <Link href={`/dashboards/${id}`} className="flex items-start gap-3 -m-1 p-1 rounded">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--ciq-purple)] flex items-center gap-1.5 flex-wrap">
            {name}
            {isPersonal && (
              <span className="chip text-[10px] uppercase">Personal</span>
            )}
          </div>
          <div className="text-xs text-[var(--ciq-ink-soft)] mt-0.5">{description}</div>
        </div>
      </Link>

      <div className="flex items-center gap-2 mt-1">
        <div className="text-[11px] text-[var(--ciq-ink-soft)]">{widgetCount} widget(s)</div>

        {isCustom ? (
          <div className="ml-auto flex items-center gap-1 text-[11px] text-amber-600">
            <LockIcon size={11} />
            <span>View only</span>
          </div>
        ) : (
          <div ref={menuRef} className="ml-auto relative">
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
              className="h-7 w-7 grid place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)] transition"
              aria-label="Card menu"
              title="Card menu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-44 card p-1 text-[12px] shadow-md">
                <button
                  onClick={() => { setMenuOpen(false); onClone(); }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[var(--violet-50)] flex items-center gap-2"
                >
                  <CloneIcon /> Clone
                </button>
                <button
                  onClick={() => { setMenuOpen(false); if (canDelete && onDelete) onDelete(); }}
                  disabled={!canDelete}
                  title={canDelete ? "Delete this dashboard" : "Canonical templates can't be deleted"}
                  className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 ${
                    canDelete ? "text-red-600 hover:bg-red-50" : "text-[var(--fg-subtle)] cursor-not-allowed"
                  }`}
                >
                  <TrashIcon /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Menus & Modals ───────────────────────────────────────────────────────────
function CreateNewMenu({
  onAskAlly,
  onTemplates,
  onClose,
}: {
  onAskAlly: () => void;
  onTemplates: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-10 z-20 w-[280px] card p-1.5 text-[13px] shadow-md">
      <button
        onClick={onAskAlly}
        className="w-full text-left px-3 py-2.5 rounded hover:bg-[var(--violet-50)] flex items-start gap-2.5"
      >
        <div className="w-7 h-7 rounded-md bg-[var(--violet-600)] grid place-items-center text-white text-[11px] font-bold shrink-0">A</div>
        <div className="min-w-0">
          <div className="font-semibold text-[var(--ciq-purple)]">Create via Ask Ally</div>
          <div className="text-[11px] text-[var(--fg-muted)] leading-snug">
            Describe what you want in chat → Ally generates widgets → save as a dashboard.
          </div>
        </div>
      </button>
      <button
        onClick={onTemplates}
        className="w-full text-left px-3 py-2.5 rounded hover:bg-[var(--violet-50)] flex items-start gap-2.5"
      >
        <div className="w-7 h-7 rounded-md bg-[var(--violet-100)] grid place-items-center text-[var(--violet-700)] shrink-0">
          <TemplateIcon />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[var(--ciq-purple)]">Templates</div>
          <div className="text-[11px] text-[var(--fg-muted)] leading-snug">
            Pick a standard dashboard and clone it as your own.
          </div>
        </div>
      </button>
    </div>
  );
}

function TemplatesModal({
  templates,
  onPick,
  onClose,
}: {
  templates: { id: string; name: string; description: string; widgets: any[] }[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative card w-full max-w-2xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-3">
          <div>
            <div className="text-base font-semibold text-[var(--ciq-purple)]">Start from a template</div>
            <div className="text-[12px] text-[var(--fg-muted)]">
              Clones the template as your own dashboard — fully editable.
            </div>
          </div>
          <button onClick={onClose} className="ml-auto chip" title="Close (Esc)">×</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="text-left rounded-lg border border-[var(--border)] p-3 hover:border-[var(--ciq-accent)] hover:bg-[var(--violet-50)] transition"
            >
              <div className="font-semibold text-[var(--ciq-purple)] text-sm">{t.name}</div>
              <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">{t.description}</div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-1">{t.widgets.length} widget(s)</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CloneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
