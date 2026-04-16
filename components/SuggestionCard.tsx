"use client";

import { Suggestion } from "@/types/session";

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  answer:          { bg: "bg-emerald-900/40", text: "text-emerald-400", label: "Answer" },
  question_to_ask: { bg: "bg-blue-900/40",    text: "text-blue-400",    label: "Question" },
  talking_point:   { bg: "bg-amber-900/40",    text: "text-amber-400",   label: "Talking Point" },
  fact_check:      { bg: "bg-rose-900/40",     text: "text-rose-400",    label: "Fact Check" },
  clarification:   { bg: "bg-purple-900/40",   text: "text-purple-400",  label: "Clarification" },
};

type Props = {
  suggestion: Suggestion;
  onClick: (suggestion: Suggestion) => void;
};

export default function SuggestionCard({ suggestion, onClick }: Props) {
  const style = TYPE_STYLES[suggestion.type] ?? TYPE_STYLES.answer;

  return (
    <button
      onClick={() => onClick(suggestion)}
      className="w-full text-left p-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all group"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>
      <p className="text-sm font-medium text-zinc-200 mb-1">{suggestion.title}</p>
      <p className="text-xs text-zinc-400 leading-relaxed">{suggestion.preview}</p>
    </button>
  );
}
