"use client";
import { useEffect, useRef, useState } from "react";

// ─── Filter column definitions ────────────────────────────────────────────────
export type FilterColumn = {
  id: string;
  label: string;
  values: string[];
};

export const FILTER_COLUMNS: FilterColumn[] = [
  {
    id: "brand",
    label: "Brand",
    values: [
      "Coca-Cola", "Pepsi", "Nestlé", "Procter & Gamble", "Unilever",
      "Kellogg's", "General Mills", "Kraft Heinz", "Mondelez", "Mars",
    ],
  },
  {
    id: "sub_brand",
    label: "Sub Brand",
    values: [
      "Diet Coke", "Coke Zero", "Coke Life", "Pepsi Max", "Pepsi Zero",
      "Mountain Dew", "7UP", "Tropicana", "Lay's Classic", "Doritos Nacho",
    ],
  },
  {
    id: "category",
    label: "Category",
    values: [
      "Beverages", "Snacks & Chips", "Personal Care", "Household Cleaners",
      "Dairy & Eggs", "Bakery", "Frozen Foods", "Condiments", "Pet Care",
    ],
  },
  {
    id: "sub_category",
    label: "Sub Category",
    values: [
      "Carbonated Soft Drinks", "Energy Drinks", "Still Water",
      "Sparkling Water", "Juice & Nectars", "Sports Drinks",
      "Salty Snacks", "Crackers & Biscuits", "Chocolate & Candy",
    ],
  },
  {
    id: "class",
    label: "Class",
    values: ["Premium", "Standard", "Value", "Economy", "Organic / Natural"],
  },
  {
    id: "sub_class",
    label: "Sub Class",
    values: [
      "Sugar-Free", "Regular", "Flavored", "Unsweetened",
      "Low-Calorie", "High-Protein", "Gluten-Free", "Vegan",
    ],
  },
  {
    id: "department",
    label: "Department",
    values: [
      "Grocery & Gourmet", "Health & Beauty", "Home Care",
      "Baby Products", "Pet Supplies", "Sports & Outdoors",
      "Office Products",
    ],
  },
  {
    id: "sku",
    label: "SKU",
    values: [
      "B08XYZ1234", "B07ABC5678", "B09DEF9012", "B06GHI3456",
      "B10JKL7890", "B05MNO2345", "B11PQR6789", "B04STU0123",
      "B12VWX4567", "B03YZA8901",
    ],
  },
];

export type ActiveFilters = Record<string, string[]>;

// ─── Component ────────────────────────────────────────────────────────────────
export default function FilterPanel({
  open,
  filters,
  onApply,
  onClose,
}: {
  open: boolean;
  filters: ActiveFilters;
  onApply: (filters: ActiveFilters) => void;
  onClose: () => void;
}) {
  // Local draft — only committed when "Apply Filter" is clicked
  const [draft, setDraft]               = useState<ActiveFilters>({});
  const [selectedCol, setSelectedCol]   = useState<FilterColumn | null>(null);
  const [colSearch, setColSearch]       = useState("");
  const [valSearch, setValSearch]       = useState("");

  // Sync draft when panel opens
  useEffect(() => {
    if (open) {
      setDraft({ ...filters });
      setSelectedCol(null);
      setColSearch("");
      setValSearch("");
    }
  }, [open, filters]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const filteredCols = FILTER_COLUMNS.filter((c) =>
    c.label.toLowerCase().includes(colSearch.toLowerCase())
  );

  const colValues     = selectedCol?.values ?? [];
  const filteredVals  = colValues.filter((v) =>
    v.toLowerCase().includes(valSearch.toLowerCase())
  );
  const selectedVals  = selectedCol ? (draft[selectedCol.id] ?? []) : [];
  const allSelected   = filteredVals.every((v) => selectedVals.includes(v));

  function toggleValue(val: string) {
    if (!selectedCol) return;
    const cur = draft[selectedCol.id] ?? [];
    const next = cur.includes(val)
      ? cur.filter((x) => x !== val)
      : [...cur, val];
    setDraft((d) => ({ ...d, [selectedCol.id]: next }));
  }

  function selectAll() {
    if (!selectedCol) return;
    const cur = draft[selectedCol.id] ?? [];
    const missing = filteredVals.filter((v) => !cur.includes(v));
    setDraft((d) => ({ ...d, [selectedCol.id]: [...cur, ...missing] }));
  }

  function clearAll() {
    if (!selectedCol) return;
    setDraft((d) => ({ ...d, [selectedCol.id]: [] }));
  }

  const totalActive = Object.values(draft).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div
        className="relative flex flex-col bg-[var(--bg)] rounded-2xl shadow-2xl border border-[var(--border)]"
        style={{ width: "min(92vw, 680px)", height: "min(90vh, 520px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3 shrink-0">
          <span className="text-[var(--violet-600)]">
            <FunnelIcon />
          </span>
          <span className="text-sm font-semibold text-[var(--fg)]">Filter</span>
          {totalActive > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--violet-600)] text-white">
              {totalActive}
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-auto chip h-7 w-7 grid place-items-center text-[var(--fg-muted)] hover:text-[var(--fg)]"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left: Column list ─────────────────────────────────────────── */}
          <div className="w-[220px] shrink-0 border-r border-[var(--border)] flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-[var(--border)]">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]">
                  <SearchIcon />
                </span>
                <input
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  placeholder="Search Column"
                  className="input w-full !pl-7 !py-1.5 text-sm"
                />
              </div>
            </div>

            {/* Column header */}
            <div className="px-3 pt-2.5 pb-1">
              <span className="label-xs">Columns</span>
            </div>

            {/* Column items */}
            <div className="flex-1 overflow-y-auto">
              {filteredCols.map((col) => {
                const count = (draft[col.id] ?? []).length;
                const isActive = col.id === selectedCol?.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => { setSelectedCol(col); setValSearch(""); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                      isActive
                        ? "bg-[var(--violet-50)] text-[var(--violet-700)]"
                        : "text-[var(--fg)] hover:bg-[var(--bg-muted)]"
                    }`}
                  >
                    <span className="flex-1">{col.label}</span>
                    {count > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--violet-100)] text-[var(--violet-700)]">
                        {count}
                      </span>
                    )}
                    <span className={`text-[10px] ${isActive ? "text-[var(--violet-500)]" : "text-[var(--fg-muted)]"}`}>
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Filter options ──────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedCol === null ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-[var(--fg-muted)]">Select a column to view filter options</p>
              </div>
            ) : (
              <>
                {/* Search + select-all bar */}
                <div className="p-3 border-b border-[var(--border)] space-y-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]">
                      <SearchIcon />
                    </span>
                    <input
                      autoFocus
                      value={valSearch}
                      onChange={(e) => setValSearch(e.target.value)}
                      placeholder={`Search ${selectedCol.label}…`}
                      className="input w-full !pl-7 !py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[12px]">
                    <button
                      onClick={allSelected ? clearAll : selectAll}
                      className="flex items-center gap-1.5 text-[var(--violet-700)] hover:underline"
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                        allSelected && filteredVals.length > 0
                          ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                          : "border-[var(--border)]"
                      }`}>
                        {allSelected && filteredVals.length > 0 && "✓"}
                      </span>
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                    {selectedVals.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-[var(--fg-muted)] hover:text-[var(--fg)] hover:underline ml-auto"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Value checkboxes */}
                <div className="flex-1 overflow-y-auto p-1">
                  {filteredVals.length === 0 ? (
                    <p className="text-sm text-[var(--fg-muted)] text-center py-6">No matches</p>
                  ) : (
                    filteredVals.map((val) => {
                      const checked = selectedVals.includes(val);
                      return (
                        <button
                          key={val}
                          onClick={() => toggleValue(val)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-md transition hover:bg-[var(--bg-muted)] ${
                            checked ? "text-[var(--violet-700)]" : "text-[var(--fg)]"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                            checked
                              ? "bg-[var(--violet-600)] border-[var(--violet-600)] text-white"
                              : "border-[var(--border)]"
                          }`}>
                            {checked && "✓"}
                          </span>
                          <span className="flex-1 truncate">{val}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border)] flex items-center gap-3 shrink-0">
          {totalActive > 0 && (
            <button
              onClick={() => {
                setDraft({});
                onApply({});
              }}
              className="btn btn-ghost !py-1 !text-[12px] text-[var(--fg-muted)]"
            >
              Clear all filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button
              onClick={() => { onApply(draft); onClose(); }}
              className="btn btn-primary"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function FunnelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
