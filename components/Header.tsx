"use client";

import { useState } from "react";
import SettingsDrawer from "./SettingsDrawer";
import ExportButton from "./ExportButton";
import ApiKeyWarning from "./ApiKeyWarning";
import ErrorBanner from "./ErrorBanner";
import { useSessionStore } from "@/hooks/useSessionStore";
import { useMicRecorderContext } from "@/hooks/useMicRecorderContext";
import { useChatGenerationContext } from "@/hooks/useChatGenerationContext";
import { clearAllAudioBlobs } from "@/hooks/useMicRecorder";

export default function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sessionStartedAt = useSessionStore((s) => s.sessionStartedAt);
  const isRecording = useSessionStore((s) => s.isRecording);
  const resetSession = useSessionStore((s) => s.resetSession);
  const endSession = useSessionStore((s) => s.endSession);

  const micCtx = useMicRecorderContext();
  const chatCtx = useChatGenerationContext();

  const hasSession = sessionStartedAt !== null;

  const handleNewSession = () => {
    if (isRecording) {
      micCtx.stop();
    }
    chatCtx.cancelGeneration();
    clearAllAudioBlobs();
    endSession();
    resetSession();
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <h1 className="text-lg font-semibold text-zinc-100">MeetMind</h1>
          <span className="text-xs text-zinc-500 ml-2 hidden sm:inline">
            Live Meeting Copilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          {hasSession && (
            <button
              onClick={handleNewSession}
              className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            >
              New Session
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Settings
          </button>
        </div>
      </header>
      <ApiKeyWarning onOpenSettings={() => setSettingsOpen(true)} />
      <ErrorBanner />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
