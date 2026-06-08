"use client";

export const NB_PROMPTS = [
  "How are sales tracking vs plan?",
  "Why is conversion down?",
  "Show ordered revenue by category",
  "Branded top-2 SOV last 13 weeks",
  "Ad spend vs ad-attributed sales by SKU",
];

export const NESTLE_PROMPTS = [
  "How is shipped revenue tracking PvP?",
  "Why did conversion drop?",
  "Availability% by category this period",
  "PO fill rate by category",
  "Top 5 SKUs contributing to shipped revenue gap",
];

export default function SuggestedPrompts({
  clientId,
  onPick,
  variant = "inline",
}: {
  clientId: string;
  onPick: (q: string) => void;
  variant?: "inline" | "sidebar";
}) {
  const prompts = clientId === "nestle" ? NESTLE_PROMPTS : NB_PROMPTS;
  
  if (variant === "sidebar") {
    return (
      <div className="flex flex-col gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="text-left p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] text-[var(--fg)] hover:border-[var(--violet-300)] hover:bg-[var(--violet-50)] transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="chip hover:border-[var(--ciq-accent)] hover:text-[var(--ciq-purple)]"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
