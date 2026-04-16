"use client";

import { useSessionStore } from "@/hooks/useSessionStore";
import { clearAllAudioBlobs } from "@/hooks/useMicRecorder";
import { useMicRecorderContext } from "@/hooks/useMicRecorderContext";
import { useChatGenerationContext } from "@/hooks/useChatGenerationContext";
import {
  MOCK_TRANSCRIPT_CHUNKS,
  MOCK_SUGGESTION_BATCHES,
  MOCK_CHAT_MESSAGES,
} from "@/lib/devSeed";

export default function DevToolbar() {
  const addTranscriptChunk = useSessionStore((s) => s.addTranscriptChunk);
  const addSuggestionBatch = useSessionStore((s) => s.addSuggestionBatch);
  const addChatMessage = useSessionStore((s) => s.addChatMessage);
  const resetSession = useSessionStore((s) => s.resetSession);
  const isRecording = useSessionStore((s) => s.isRecording);
  const startRecording = useSessionStore((s) => s.startRecording);
  const audioChunks = useSessionStore((s) => s.audioChunks);
  const transcriptChunks = useSessionStore((s) => s.transcriptChunks);
  const suggestionBatches = useSessionStore((s) => s.suggestionBatches);

  const micCtx = useMicRecorderContext();
  const chatCtx = useChatGenerationContext();

  if (process.env.NODE_ENV === "production") return null;

  const seedAll = () => {
    startRecording();
    MOCK_TRANSCRIPT_CHUNKS.forEach(addTranscriptChunk);
    MOCK_SUGGESTION_BATCHES.forEach(addSuggestionBatch);
    MOCK_CHAT_MESSAGES.forEach(addChatMessage);
  };

  const handleReset = () => {
    if (isRecording) micCtx.stop();
    chatCtx.cancelGeneration();
    clearAllAudioBlobs();
    resetSession();
  };

  const statusCounts = audioChunks.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="fixed bottom-3 left-3 z-50 flex gap-1.5 items-center">
      <button
        onClick={seedAll}
        className="px-2 py-1 text-[10px] rounded bg-yellow-900/80 text-yellow-300 hover:bg-yellow-800 border border-yellow-700/50"
      >
        DEV: Seed
      </button>
      <button
        onClick={handleReset}
        className="px-2 py-1 text-[10px] rounded bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 border border-zinc-700/50"
      >
        DEV: Reset
      </button>
      {audioChunks.length > 0 && (
        <span className="text-[10px] text-zinc-600 font-mono">
          A:{audioChunks.length}
          {Object.entries(statusCounts).map(([s, n]) => ` ${s[0]}:${n}`)}
          {" "}T:{transcriptChunks.length}
        </span>
      )}
      {suggestionBatches.length > 0 && (
        <span className="text-[10px] text-zinc-600 font-mono">
          {" "}S:{suggestionBatches.length}
        </span>
      )}
    </div>
  );
}
