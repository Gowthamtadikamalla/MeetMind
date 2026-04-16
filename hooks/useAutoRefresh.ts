import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "./useSessionStore";
import { generateSuggestionBatch } from "@/lib/generateSuggestions";
import type { TranscriptChunk } from "@/types/session";

/**
 * Computes a short signature from recent transcript chunk ids.
 * Used to detect whether the transcript basis has meaningfully changed.
 */
function computeBasisSignature(chunks: TranscriptChunk[], windowSize: number): string {
  const recent = chunks.slice(-windowSize);
  if (recent.length === 0) return "";
  return recent.map((c) => c.id).join("|");
}

/**
 * Auto-generates suggestions when new transcript chunks are added.
 * Also exposes a manual refresh function.
 *
 * Dedup guards (auto only):
 *   1. lastSuggestedTranscriptCount -- new meaningful chunks must exist
 *   2. lastSuggestedChunkIndex -- the newest chunk index must have advanced
 *   3. lastSuggestedBasisSignature -- the set of recent chunk ids must differ
 */
export function useAutoRefresh() {
  const transcriptChunks = useSessionStore((s) => s.transcriptChunks);
  const isGenerating = useSessionStore((s) => s.isGeneratingSuggestions);

  const isGeneratingRef = useRef(false);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  const runSuggestionGeneration = useCallback(
    async (source: "auto" | "manual") => {
      if (isGeneratingRef.current) return;

      const state = useSessionStore.getState();

      const meaningfulChunks = state.transcriptChunks.filter(
        (c) => c.text.trim().length > 0
      );
      if (meaningfulChunks.length === 0) return;

      if (source === "auto") {
        const newestChunkIndex =
          meaningfulChunks.length > 0
            ? meaningfulChunks[meaningfulChunks.length - 1].chunkIndex
            : -1;

        if (newestChunkIndex <= state.lastSuggestedChunkIndex) return;

        if (meaningfulChunks.length <= state.lastSuggestedTranscriptCount) return;

        const sig = computeBasisSignature(
          meaningfulChunks,
          state.settings.suggestionContextChunks
        );
        if (sig && sig === state.lastSuggestedBasisSignature) return;
      }

      isGeneratingRef.current = true;
      useSessionStore.getState().setGeneratingSuggestions(true);
      useSessionStore.getState().clearError("suggestionsError");

      try {
        const freshState = useSessionStore.getState();
        const result = await generateSuggestionBatch({
          transcriptChunks: freshState.transcriptChunks,
          suggestionBatches: freshState.suggestionBatches,
          rollingSummary: freshState.rollingSessionSummary,
          settings: freshState.settings,
          source,
        });

        const store = useSessionStore.getState();
        store.addSuggestionBatch(result.batch);
        store.setRollingSessionSummary(result.updatedSummary);

        const updatedChunks = useSessionStore
          .getState()
          .transcriptChunks.filter((c) => c.text.trim().length > 0);

        store.setLastSuggestedTranscriptCount(updatedChunks.length);

        const newestIdx =
          updatedChunks.length > 0
            ? updatedChunks[updatedChunks.length - 1].chunkIndex
            : -1;
        store.setLastSuggestedChunkIndex(newestIdx);

        store.setLastSuggestedBasisSignature(
          computeBasisSignature(updatedChunks, freshState.settings.suggestionContextChunks)
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Suggestion generation failed.";
        useSessionStore.getState().setError("suggestionsError", message);
      } finally {
        useSessionStore.getState().setGeneratingSuggestions(false);
        isGeneratingRef.current = false;
      }
    },
    []
  );

  const prevCountRef = useRef(transcriptChunks.length);
  useEffect(() => {
    const currentCount = transcriptChunks.length;
    if (currentCount > prevCountRef.current) {
      prevCountRef.current = currentCount;
      runSuggestionGeneration("auto");
    }
  }, [transcriptChunks.length, runSuggestionGeneration]);

  const triggerManualRefresh = useCallback(() => {
    runSuggestionGeneration("manual");
  }, [runSuggestionGeneration]);

  return { triggerManualRefresh };
}
