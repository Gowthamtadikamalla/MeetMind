import { SessionState } from "@/types/session";

export function buildExportPayload(state: SessionState) {
  const { groqApiKey: _omitted, ...safeSettings } = state.settings;
  void _omitted;

  return {
    exportVersion: "1.0",
    exportedAt: new Date().toISOString(),
    sessionStartedAt: state.sessionStartedAt,
    sessionEndedAt: state.sessionEndedAt ?? new Date().toISOString(),
    transcriptChunks: state.transcriptChunks,
    suggestionBatches: state.suggestionBatches,
    chatMessages: state.chatMessages.map((msg) => {
      const { isStreaming: _s, isError, ...rest } = msg;
      void _s;
      return { ...rest, ...(isError ? { isError: true } : {}) };
    }),
    rollingSessionSummary: {
      note: "Model-generated session memory, not raw transcript.",
      content: state.rollingSessionSummary,
    },
    metadata: {
      audioChunkCount: state.audioChunks.length,
      transcriptChunkCount: state.transcriptChunks.length,
      suggestionBatchCount: state.suggestionBatches.length,
      chatMessageCount: state.chatMessages.length,
    },
    settings: safeSettings,
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
