"use client";
import { useState } from "react";
import { semanticRegistry } from "@/lib/semantic/registry";
import { useClient } from "@/lib/state/store";

export default function DataDomainSetup() {
  const [client] = useClient();
  const [connected, setConnected] = useState(true);
  const [warehouse, setWarehouse] = useState("Databricks · CIQ-EU prod");
  const [accountModel, setAccountModel] = useState("Amazon Vendor Central");
  const allMetrics = semanticRegistry.metrics;
  const [selected, setSelected] = useState<string[]>(allMetrics.map((m) => m.id));

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ciq-purple)]">Data &amp; Domain setup</h1>
        <p className="text-sm text-[var(--ciq-ink-soft)]">
          Onboarding flow for a new account. Mirrors a Wisdom-style domain config tailored to CIQ's account model.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-[var(--ciq-purple)]">Source connection</div>
          <span className="ml-auto chip">{connected ? "✅ Connected" : "Disconnected"}</span>
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <Field label="Warehouse" value={warehouse} onChange={setWarehouse} />
          <Field label="Account model" value={accountModel} onChange={setAccountModel} />
          <Field label="Client" value={client} readOnly />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-subtle" onClick={() => setConnected((v) => !v)}>{connected ? "Disconnect" : "Connect"}</button>
          <button className="btn btn-ghost" disabled>Test query</button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm font-semibold text-[var(--ciq-purple)]">In-scope metrics</div>
        <div className="text-xs text-[var(--ciq-ink-soft)]">Point-and-click selection against the semantic registry. Toggling here changes what Ally can resolve to.</div>
        <div className="grid md:grid-cols-2 gap-1.5">
          {allMetrics.map((m) => (
            <label key={m.id} className="flex items-center gap-2 rounded-md border bg-[#faf9fb] px-2.5 py-1.5 text-sm">
              <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
              <span className="font-medium text-[var(--ciq-purple)]">{m.label}</span>
              <span className="text-[10px] text-[var(--ciq-ink-soft)] truncate">{m.backendName}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, readOnly }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <label className="block">
      <div className="label-xs mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="w-full h-9 px-2 rounded-md border bg-white text-sm"
      />
    </label>
  );
}
