"use client";
import { format, formatDelta } from "@/lib/semantic/compute";
import type { Format } from "@/lib/semantic/types";

export default function KpiTile({
  label,
  value,
  delta,
  fmt = "currency",
  sub,
  status,
}: {
  label: string;
  value: number;
  delta?: number;
  fmt?: Format;
  sub?: string;
  status?: "good" | "warn" | "bad";
}) {
  const color =
    status === "bad" ? "text-red-600" : status === "warn" ? "text-amber-600" : "text-emerald-600";
  return (
    <div className="card p-4">
      <div className="label-xs">{label}</div>
      <div className="text-2xl font-semibold text-[var(--ciq-purple)] mt-1.5">{format(value, fmt)}</div>
      {delta !== undefined && (
        <div className={`text-xs mt-1 font-medium ${delta < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {formatDelta(delta)} vs prior
        </div>
      )}
      {sub && <div className={`text-[11px] mt-1 ${color}`}>{sub}</div>}
    </div>
  );
}
