"use client";

import { v4 as uuid } from "uuid";
import { useSessionStore } from "@/hooks/useSessionStore";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useMicRecorderContext } from "@/hooks/useMicRecorderContext";
import { useChatGenerationContext } from "@/hooks/useChatGenerationContext";
import SuggestionCard from "./SuggestionCard";
import type { Suggestion, SuggestionBatch, ChatMessage } from "@/types/session";

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuggestionsPanel() {
  const batches = useSessionStore((s) => s.suggestionBatches);
  const isGenerating = useSessionStore((s) => s.isGeneratingSuggestions);
  const isRecording = useSessionStore((s) => s.isRecording);
  const isGeneratingChat = useSessionStore((s) => s.isGeneratingChat);
  const suggestionsError = useSessionStore((s) => s.errors.suggestionsError);
  const addChatMessage = useSessionStore((s) => s.addChatMessage);

  const { triggerManualRefresh } = useAutoRefresh();
  const micCtx = useMicRecorderContext();
  const { generateResponse } = useChatGenerationContext();

  const handleSuggestionClick = (suggestion: Suggestion, batch: SuggestionBatch) => {
    if (isGeneratingChat) return;

    const msg: ChatMessage = {
      id: uuid(),
      role: "user",
      content: `[${suggestion.type.replace(/_/g, " ")}] ${suggestion.title}\n${suggestion.preview}`,
      createdAt: new Date().toISOString(),
      linkedSuggestionId: suggestion.id,
      suggestionMeta: {
        suggestionId: suggestion.id,
        suggestionType: suggestion.type,
        suggestionTitle: suggestion.title,
        suggestionBatchId: batch.id,
      },
    };

    addChatMessage(msg);
    generateResponse(msg);
  };

  const handleRefresh = () => {
    if (isRecording) {
      micCtx.requestFlush();
    }
    triggerManualRefresh();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">Live Suggestions</h2>
        <button
          onClick={handleRefresh}
          disabled={isGenerating}
          className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors disabled:opacity-40"
        >
          {isGenerating ? "Generating..." : "Refresh"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {batches.length === 0 && !isGenerating && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-500">
              Suggestions will appear here after transcript starts.
            </p>
          </div>
        )}
        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Generating suggestions...
          </div>
        )}
        {suggestionsError && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-400">{suggestionsError}</p>
            {/* Retry generates a fresh batch from the current transcript state,
                not a replay of the exact failed request. This is intentional:
                the transcript may have advanced since the failure. */}
            <button
              onClick={handleRefresh}
              className="text-xs text-red-400 hover:text-red-200 ml-2 shrink-0"
            >
              Retry
            </button>
          </div>
        )}
        {batches.map((batch, batchIdx) => (
          <div key={batch.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-mono">
                {formatTime(batch.createdAt)}
              </span>
              <span className="text-[10px] text-zinc-700">
                {batch.source === "manual" ? "manual" : "auto"}
              </span>
              {batchIdx === 0 && (
                <span className="text-[10px] text-indigo-500 font-medium">latest</span>
              )}
            </div>
            {batch.suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onClick={(s) => handleSuggestionClick(s, batch)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
