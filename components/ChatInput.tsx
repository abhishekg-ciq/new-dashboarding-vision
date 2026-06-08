import { useState, useRef, useEffect } from "react";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) {
        onSubmit(value);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full relative flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-white shadow-sm p-2 transition-shadow focus-within:ring-2 focus-within:ring-[var(--violet-200)] focus-within:border-[var(--violet-400)]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask Ally..."}
          className="flex-1 max-h-[120px] resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-[14px] text-[var(--fg)] outline-none placeholder-[var(--fg-muted)] leading-relaxed"
          rows={1}
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!loading && value.trim()) onSubmit(value);
          }}
          disabled={loading || !value.trim()}
          className="shrink-0 h-8 w-8 rounded-full bg-[var(--violet-600)] text-white grid place-items-center hover:bg-[var(--violet-500)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          {loading ? (
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </button>
      </div>
      <div className="mt-2 text-[10px] text-[var(--fg-muted)] text-center px-4 leading-tight">
        Agent is currently trained to answer SKU level RCA only. AI can make mistakes. Please double-check responses.
      </div>
    </div>
  );
}
