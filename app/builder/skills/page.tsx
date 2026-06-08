"use client";
import { useMemo, useState } from "react";
import { useSkillLibrary, type SkillLibraryEntry } from "@/lib/state/store";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const BLANK: SkillLibraryEntry = {
  id: "",
  name: "",
  description: "",
  body: "# New skill\n\nDescribe what this skill does in plain English. Markdown is supported.\n\n- Step 1\n- Step 2\n- Step 3\n",
  builtIn: false,
  updatedAt: 0,
};

export default function SkillsPage() {
  const { list, upsert, remove } = useSkillLibrary();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SkillLibraryEntry | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return list;
    const f = filter.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(f) || s.description.toLowerCase().includes(f));
  }, [list, filter]);

  const selected = list.find((s) => s.id === selectedId) || null;
  const editing = draft !== null;

  const startNew = () => {
    setDraft({ ...BLANK });
    setSelectedId(null);
  };

  const startEdit = (s: SkillLibraryEntry) => {
    setDraft({ ...s });
  };

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    const id = draft.id || slug(draft.name);
    upsert({ ...draft, id });
    setDraft(null);
    setSelectedId(id);
  };

  const cancel = () => setDraft(null);

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end gap-3">
        <div>
          <div className="eyebrow mb-1">Builder · Skills</div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--fg)]">Skills library</h1>
          <p className="mt-1 text-[14px] text-[var(--fg-muted)] max-w-2xl">
            Plain-English markdown skills that workflows and Ask Ally can reference. Think of them as named procedures — write once, reuse everywhere.
          </p>
        </div>
        <button onClick={startNew} className="ml-auto h-9 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--violet-500)] transition">
          + New skill
        </button>
      </div>

      <div className="grid md:grid-cols-[280px,1fr] gap-4">
        {/* LEFT: list */}
        <div className="space-y-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search skills…"
            className="input w-full"
          />
          <div className="space-y-1">
            {filtered.map((s) => {
              const active = selectedId === s.id && !editing;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedId(s.id); setDraft(null); }}
                  className={`w-full text-left rounded-md border p-2.5 transition ${
                    active
                      ? "border-[var(--violet-600)] bg-[var(--violet-50)]"
                      : "border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--gray-50)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[var(--violet-700)] flex-none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="13" y2="17" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-[var(--fg)] truncate">{s.name}</div>
                      <div className="text-[11px] text-[var(--fg-muted)] truncate">{s.id}.md</div>
                    </div>
                    {s.builtIn && (
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--gray-100)] text-[var(--gray-700)]">built-in</span>
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--fg-muted)] mt-1 leading-snug line-clamp-2">{s.description}</div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-[12px] text-[var(--fg-muted)] p-3">No skills match "{filter}".</div>
            )}
          </div>
        </div>

        {/* RIGHT: editor or viewer */}
        <div className="card p-5 min-h-[420px]">
          {editing && draft && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="eyebrow">Editing</div>
                <span className="text-[12px] text-[var(--fg-muted)]">{draft.id ? `${draft.id}.md` : "new-skill.md"}</span>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={cancel} className="btn btn-ghost h-8 text-xs">Cancel</button>
                  <button onClick={save} disabled={!draft.name.trim()} className="h-8 inline-flex items-center gap-1.5 rounded-md bg-[var(--violet-600)] px-3 text-xs font-semibold text-white hover:bg-[var(--violet-500)] transition disabled:opacity-50">Save skill</button>
                </div>
              </div>

              <label className="block">
                <div className="eyebrow mb-1.5">Name</div>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input w-full" placeholder="e.g. Pricing Watch" />
              </label>
              <label className="block">
                <div className="eyebrow mb-1.5">One-line description</div>
                <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="input w-full" placeholder="What does this skill help Ally do?" />
              </label>
              <label className="block">
                <div className="eyebrow mb-1.5">Skill body (markdown)</div>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={18}
                  className="input w-full !h-auto py-3 font-mono text-[13px] leading-[1.55]"
                />
              </label>
              <div className="text-[11px] text-[var(--fg-muted)]">
                Plain English works best. Headings, bullet lists, and short numbered steps render naturally — no special syntax required.
              </div>
            </div>
          )}

          {!editing && selected && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[20px] font-bold text-[var(--fg)]">{selected.name}</h2>
                    {selected.builtIn && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--gray-100)] text-[var(--gray-700)]">built-in</span>
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--fg-muted)] mt-0.5">{selected.id}.md{selected.updatedAt ? ` · updated ${new Date(selected.updatedAt).toLocaleDateString()}` : ""}</div>
                  <div className="text-[14px] text-[var(--fg-muted)] mt-1">{selected.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(selected)} className="btn btn-ghost h-8 text-xs">Edit</button>
                  {!selected.builtIn && (
                    <button onClick={() => { if (confirm(`Delete "${selected.name}"?`)) { remove(selected.id); setSelectedId(null); } }} className="btn btn-ghost h-8 text-xs">Delete</button>
                  )}
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-4">
                <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.7] text-[var(--fg)]">{selected.body}</pre>
              </div>
            </div>
          )}

          {!editing && !selected && (
            <div className="h-full grid place-items-center text-center py-12">
              <div>
                <div className="text-[14px] font-semibold text-[var(--fg)]">No skill selected</div>
                <div className="text-[13px] text-[var(--fg-muted)] mt-1 max-w-sm">
                  Pick a skill from the left to read it, or click <span className="font-semibold text-[var(--fg)]">+ New skill</span> to write one in plain English.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
