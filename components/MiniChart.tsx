"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "@/lib/semantic/compute";
import type { ChartSpec } from "@/lib/semantic/types";

const ACCENT = "#C231FF";
const COBALT = "#1F22B2";
const SKY = "#5AAFFE";
const DOWN = "#dc2626";

function shorten(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

export function TrendChart({
  rows,
  yKey = "revenue",
  refKey = "plan",
}: {
  rows: any[];
  yKey?: string;
  refKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#ece9f0" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#6b6577" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b6577" }} tickFormatter={shorten} width={50} />
        <Tooltip
          formatter={(v: any) => format(Number(v), "currency")}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #ece9f0" }}
        />
        {refKey && (
          <Line
            type="monotone"
            dataKey={refKey}
            stroke={SKY}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
          />
        )}
        <Line type="monotone" dataKey={yKey} stroke={ACCENT} strokeWidth={2.5} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarBreakdown({
  rows,
  xKey = "key",
  yKey = "now",
  signed = false,
}: {
  rows: any[];
  xKey?: string;
  yKey?: string;
  signed?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#ece9f0" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#6b6577" }}
          interval={0}
          angle={-22}
          textAnchor="end"
          height={50}
        />
        <YAxis tick={{ fontSize: 11, fill: "#6b6577" }} tickFormatter={shorten} width={56} />
        <Tooltip
          formatter={(v: any) => (Math.abs(Number(v)) >= 1 ? shorten(Number(v)) : Number(v).toFixed(2))}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #ece9f0" }}
        />
        {signed && <ReferenceLine y={0} stroke="#999" />}
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={signed ? (Number(r[yKey]) < 0 ? DOWN : COBALT) : ACCENT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WaterfallChart({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const rows = [...items, { label: "Net Δ", value: total }];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#ece9f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b6577" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b6577" }} tickFormatter={shorten} width={56} />
        <Tooltip formatter={(v: any) => shorten(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <ReferenceLine y={0} stroke="#999" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={i === rows.length - 1 ? COBALT : r.value < 0 ? DOWN : SKY} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ rows, yKey = "revenue" }: { rows: any[]; yKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={rows}>
        <Line type="monotone" dataKey={yKey} stroke={ACCENT} strokeWidth={1.6} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Chart({ spec, rows }: { spec: ChartSpec; rows: any[] }) {
  if (spec.type === "line") return <TrendChart rows={rows} yKey={spec.y || "revenue"} refKey={spec.series?.[0]} />;
  if (spec.type === "bar") return <BarBreakdown rows={rows} xKey={spec.x || "key"} yKey={spec.y || "now"} />;
  return null;
}
