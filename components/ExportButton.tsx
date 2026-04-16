"use client";

import { useSessionStore } from "@/hooks/useSessionStore";
import { buildExportPayload, downloadJson } from "@/lib/exportSession";

export default function ExportButton() {
  const transcriptChunks = useSessionStore((s) => s.transcriptChunks);
  const suggestionBatches = useSessionStore((s) => s.suggestionBatches);
  const chatMessages = useSessionStore((s) => s.chatMessages);

  const hasData =
    transcriptChunks.length > 0 ||
    suggestionBatches.length > 0 ||
    chatMessages.length > 0;

  const handleExport = () => {
    const state = useSessionStore.getState();
    const payload = buildExportPayload(state);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(payload, `meetmind-session-${timestamp}.json`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!hasData}
      className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Export
    </button>
  );
}
