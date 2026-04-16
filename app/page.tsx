"use client";

import { useMemo } from "react";
import Header from "@/components/Header";
import MicPanel from "@/components/MicPanel";
import TranscriptPanel from "@/components/TranscriptPanel";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import ChatPanel from "@/components/ChatPanel";
import DevToolbar from "@/components/DevToolbar";
import { useTranscriptionPipeline } from "@/hooks/useTranscriptionPipeline";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { MicRecorderContext } from "@/hooks/useMicRecorderContext";
import { useChatGeneration } from "@/hooks/useChatGeneration";
import { ChatGenerationContext } from "@/hooks/useChatGenerationContext";

export default function Home() {
  const { retryFailed: retryTranscription } = useTranscriptionPipeline();
  const mic = useMicRecorder();
  const chat = useChatGeneration();

  const micContextValue = useMemo(
    () => ({
      start: mic.start,
      stop: mic.stop,
      requestFlush: mic.requestFlush,
      elapsedRef: mic.elapsedRef,
    }),
    [mic.start, mic.stop, mic.requestFlush, mic.elapsedRef]
  );

  const chatContextValue = useMemo(
    () => ({
      generateResponse: chat.generateResponse,
      cancelGeneration: chat.cancelGeneration,
      retryLastFailed: chat.retryLastFailed,
    }),
    [chat.generateResponse, chat.cancelGeneration, chat.retryLastFailed]
  );

  return (
    <MicRecorderContext.Provider value={micContextValue}>
      <ChatGenerationContext.Provider value={chatContextValue}>
        <div className="flex flex-col h-screen overflow-hidden">
          <Header />
          <DevToolbar />
          <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
            <section className="flex flex-col md:w-1/3 h-1/3 md:h-auto border-b md:border-b-0 md:border-r border-zinc-800">
            <MicPanel />
            <TranscriptPanel retryTranscription={retryTranscription} />
            </section>

            <section className="flex flex-col md:w-1/3 h-1/3 md:h-auto border-b md:border-b-0 md:border-r border-zinc-800">
              <SuggestionsPanel />
            </section>

            <section className="flex flex-col md:w-1/3 h-1/3 md:h-auto">
              <ChatPanel />
            </section>
          </main>
        </div>
      </ChatGenerationContext.Provider>
    </MicRecorderContext.Provider>
  );
}
