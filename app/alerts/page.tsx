"use client";
import { useMemo, useState } from "react";
import {
  brandAlerts,
  formatDollars,
  type AlertCheckResult,
  type SkuAlertItem,
  type SkuRow,
} from "@/lib/sku-alerts/data";

const ALL_BRANDS = Object.keys(brandAlerts);

type ReadState = Record<string, boolean>; // skuId → read?

const ISSUE_TYPES = [
  "All Issues",
  "Promo Badge",
  "Buy Box",
  "Media Spend",
  "Content",
  "Pricing",
] as const;

const CATEGORIES = ["All Categories", "Robotics", "Uprights", "Kitchen Systems"] as const;

export default function AlertsPage() {
  const [activeBrand, setActiveBrand] = useState<string>("Shark");
  const dataset = brandAlerts[activeBrand];
  const [readMap, setReadMap] = useState<ReadState>({});
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [issueFilter, setIssueFilter] = useState<(typeof ISSUE_TYPES)[number]>("All Issues");
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORIES)[number]>("All Categories");
  const [query, setQuery] = useState("");
  const [selectedSkuId, setSelectedSkuId] = useState<string>(dataset.groups[0].skus[0]?.id);
  const [openAlertIds, setOpenAlertIds] = useState<Record<string, boolean>>({});

  const totalSkus = useMemo(
    () => dataset.groups.reduce((acc, g) => acc + g.skus.length, 0),
    [dataset],
  );

  const filteredGroups = useMemo(() => {
    return dataset.groups
      .filter((g) => categoryFilter === "All Categories" || g.name === categoryFilter)
      .map((g) => ({
        ...g,
        skus: g.skus.filter((s) => {
          if (unreadOnly && readMap[s.id]) return false;
          if (issueFilter !== "All Issues" && !s.tags.includes(issueFilter as any)) return false;
          if (query.trim() && !`${s.asin} ${s.brandSku} ${s.title}`.toLowerCase().includes(query.toLowerCase())) return false;
          return true;
        }),
      }))
      .filter((g) => g.skus.length > 0);
  }, [dataset, categoryFilter, unreadOnly, readMap, issueFilter, query]);

  const allSkus = useMemo(() => filteredGroups.flatMap((g) => g.skus), [filteredGroups]);
  const selectedSku = useMemo(
    () => allSkus.find((s) => s.id === selectedSkuId) || allSkus[0],
    [allSkus, selectedSkuId],
  );

  const toggleAlert = (id: string) =>
    setOpenAlertIds((m) => ({ ...m, [id]: !m[id] }));

  const markRead = (id: string) => setReadMap((m) => ({ ...m, [id]: true }));

  const clearFilters = () => {
    setUnreadOnly(false);
    setIssueFilter("All Issues");
    setCategoryFilter("All Categories");
    setQuery("");
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* LEFT: filter bar + SKU list */}
      <div className="w-[420px] shrink-0 border-r border-[var(--border)] bg-[var(--bg)] flex flex-col">
        {/* Filters */}
        <div className="border-b border-[var(--border)] p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SKU"
                className="h-8 pl-7 pr-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[12px] w-[160px] focus:outline-none focus:border-[var(--ring)]"
              />
            </div>
            <ChipToggle
              label="All"
              active={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
            />
            <ChipToggle
              label="Unread"
              active={unreadOnly}
              onClick={() => setUnreadOnly(true)}
            />
            <ChipSelect<typeof issueFilter>
              value={issueFilter}
              options={ISSUE_TYPES as unknown as string[]}
              onChange={(v) => setIssueFilter(v as any)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <BrandChip
              brand={activeBrand}
              impact={dataset.totalImpact}
              onClear={() => setActiveBrand(ALL_BRANDS[0])}
            />
            <ChipSelect<typeof categoryFilter>
              value={categoryFilter}
              options={CATEGORIES as unknown as string[]}
              onChange={(v) => setCategoryFilter(v as any)}
            />
            <button onClick={clearFilters} className="text-[12px] text-[var(--violet-700)] hover:text-[var(--violet-500)] ml-1">
              Clear
            </button>
            <div className="ml-auto flex items-center gap-1">
              {ALL_BRANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setActiveBrand(b)}
                  className={`h-6 px-2 rounded text-[11px] font-semibold transition ${
                    b === activeBrand
                      ? "bg-[var(--violet-50)] text-[var(--violet-700)]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SKU list header */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="text-[14px] font-semibold text-[var(--fg)]">Today&apos;s SKUs ({totalSkus})</div>
          <div className="text-[11px] text-[var(--fg-muted)]">based on previous 24 hours data</div>
        </div>

        {/* SKU groups */}
        <div className="flex-1 overflow-y-auto scroll-thin">
          {filteredGroups.map((group) => (
            <div key={group.id} className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-subtle)]">
                <div className="text-[13px] font-medium text-[var(--fg)]">
                  {group.name} <span className="text-[var(--fg-muted)]">({group.skus.length})</span>
                </div>
                <div className="text-[13px] font-semibold text-[var(--red-600)]">{formatDollars(group.totalImpact)}</div>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {group.skus.map((sku) => {
                  const active = selectedSku?.id === sku.id;
                  const read = readMap[sku.id];
                  return (
                    <button
                      key={sku.id}
                      onClick={() => {
                        setSelectedSkuId(sku.id);
                        markRead(sku.id);
                      }}
                      className={`block w-full text-left px-4 py-3 transition relative ${
                        active
                          ? "bg-[var(--violet-50)]"
                          : "hover:bg-[var(--gray-50)]"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--violet-600)]" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] font-mono text-[var(--fg-muted)]">
                          {sku.asin} · {sku.brandSku} · <span className="text-[var(--fg-muted)]">{sku.category}</span>
                        </div>
                        <div className="text-[12px] font-semibold text-[var(--red-600)] whitespace-nowrap">
                          {formatDollars(sku.revenueImpact)}
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 mt-1.5">
                        <div className="w-10 h-10 shrink-0 grid place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] text-[20px]">
                          {sku.imageEmoji}
                        </div>
                        <div className="text-[13px] text-[var(--fg)] leading-snug line-clamp-2">
                          {sku.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {sku.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)]">
                            {t}
                          </span>
                        ))}
                        {!read && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-[var(--violet-600)]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div className="p-6 text-center text-sm text-[var(--fg-muted)]">No SKUs match your filters.</div>
          )}
        </div>
      </div>

      {/* RIGHT: detail */}
      {selectedSku ? (
        <SkuDetail
          sku={selectedSku}
          openAlertIds={openAlertIds}
          toggleAlert={toggleAlert}
          onClose={() => setSelectedSkuId(undefined as any)}
        />
      ) : (
        <div className="flex-1 grid place-items-center text-[var(--fg-muted)] text-sm">
          Select a SKU to see its alerts.
        </div>
      )}
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition border ${
        active
          ? "bg-[var(--violet-50)] text-[var(--violet-700)] border-[var(--violet-200)]"
          : "bg-[var(--bg)] text-[var(--fg-muted)] border-[var(--border)] hover:text-[var(--fg)]"
      }`}
    >
      {label}
    </button>
  );
}

function ChipSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: string[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value as unknown as string}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-7 pl-2.5 pr-7 rounded-md text-[12px] font-medium border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] appearance-none focus:outline-none focus:border-[var(--ring)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fg-muted)]">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function BrandChip({ brand, impact, onClear }: { brand: string; impact: number; onClear: () => void }) {
  return (
    <span className="h-7 inline-flex items-center gap-1.5 pl-2.5 pr-1 rounded-md text-[12px] font-medium border border-[var(--violet-200)] bg-[var(--violet-50)] text-[var(--violet-700)]">
      {brand.toLowerCase()}
      <span className="text-[var(--red-600)] font-semibold">{formatDollars(impact / 1000)}K</span>
      <button onClick={onClear} className="h-5 w-5 grid place-items-center rounded text-[var(--violet-700)] hover:bg-[var(--violet-100)]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </span>
  );
}

function SkuDetail({
  sku,
  openAlertIds,
  toggleAlert,
  onClose,
}: {
  sku: SkuRow;
  openAlertIds: Record<string, boolean>;
  toggleAlert: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto scroll-thin">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] px-6 py-4 flex items-start gap-3 z-10">
        <div className="w-10 h-10 shrink-0 grid place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] text-[20px]">
          {sku.imageEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[var(--fg)] leading-snug line-clamp-2">{sku.title}</div>
          <div className="text-[11px] font-mono text-[var(--fg-muted)] mt-0.5">
            {sku.asin} · {sku.brandSku} · {sku.category} · {formatDollars(sku.revenueImpact)}
          </div>
        </div>
        <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--gray-50)] hover:text-[var(--fg)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Alert items */}
      <div className="px-6 py-4 space-y-2">
        {sku.alerts.map((a) => {
          const open = openAlertIds[a.id] ?? a.status === "open";
          return (
            <AlertRow key={a.id} alert={a} open={open} onToggle={() => toggleAlert(a.id)} />
          );
        })}
      </div>
    </div>
  );
}

function statusDot(status: SkuAlertItem["status"]) {
  if (status === "open") return "bg-[var(--red-500)]";
  if (status === "warning") return "bg-[var(--amber-500)]";
  return "bg-[var(--emerald-500)]";
}

function statusBadge(status: SkuAlertItem["status"]) {
  if (status === "open") {
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--red-50)] text-[var(--red-600)]">Open</span>;
  }
  if (status === "warning") {
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--amber-50)] text-[var(--amber-600)]">Warning</span>;
  }
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--emerald-50)] text-[var(--emerald-600)]">OK</span>;
}

function AlertRow({ alert, open, onToggle }: { alert: SkuAlertItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`w-2 h-2 rounded-full ${statusDot(alert.status)}`} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[var(--fg-muted)]">
          <path d="M11 5h2v2h-2zM11 9h2v10h-2z" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span className="text-[14px] font-medium text-[var(--fg)]">{alert.label}</span>
        {statusBadge(alert.status)}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-auto text-[var(--fg-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (alert.checks || alert.priceCard || alert.weeklySnapshot || alert.summary) && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[var(--border)]">
          {alert.summary && (
            <div className="text-[14px] text-[var(--fg)] pt-3">{alert.summary}</div>
          )}

          {alert.checks && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-4 space-y-2">
              {alert.checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-[var(--fg)]">{c.label}</span>
                  <CheckMark result={c.result} />
                </div>
              ))}
            </div>
          )}

          {alert.priceCard && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--red-200)] bg-[var(--red-50)] p-3">
                <div className="text-[11px] text-[var(--fg-muted)] mb-1">Original</div>
                <div className="text-[18px] font-bold text-[var(--fg)] flex items-baseline gap-2">
                  {alert.priceCard.original}
                  {alert.priceCard.msrp && (
                    <span className="text-[11px] text-[var(--fg-muted)] font-normal">M.R.P: <span className="line-through">{alert.priceCard.msrp}</span></span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
                <div className="text-[11px] text-[var(--fg-muted)] mb-1">Selling</div>
                <div className="text-[18px] font-bold text-[var(--fg)]">{alert.priceCard.selling}</div>
              </div>
            </div>
          )}

          {alert.weeklySnapshot && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--emerald-500)]" />
                <span className="text-[13px] font-medium text-[var(--fg)]">{alert.weeklySnapshot.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                {alert.weeklySnapshot.metrics.map((m, idx) => {
                  const isImpact = m.label === "Est. Revenue Impact";
                  return (
                    <div key={m.label}>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)]">{m.label}</div>
                      <div className="mt-1 text-[18px] font-bold text-[var(--fg)]">
                        {isImpact ? (
                          <span className="text-[var(--red-600)]">{formatDollars(alert.weeklySnapshot!.revenueImpact)}</span>
                        ) : (
                          <>
                            <span>{m.numerator}</span>
                            <span className="text-[var(--fg-muted)] font-normal text-[14px]"> / {m.denominator}</span>
                            <span className="text-[var(--fg-muted)] font-normal text-[12px]"> days</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              Helpful
            </button>
            <button className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
              Not helpful
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckMark({ result }: { result: AlertCheckResult }) {
  if (result === "pass") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--emerald-600)]">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (result === "fail") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--red-600)]">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return <span className="text-[12px] text-[var(--fg-muted)]">—</span>;
}
