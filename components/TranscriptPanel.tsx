"use client";

import { useRef, useEffect } from "react";
import { useSessionStore } from "@/hooks/useSessionStore";

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type Props = {
  retryTranscription?: () => void;
};

export default function TranscriptPanel({ retryTranscription }: Props) {
  const chunks = useSessionStore((s) => s.transcriptChunks);
  const isTranscribing = useSessionStore((s) => s.isTranscribing);
  const isRecording = useSessionStore((s) => s.isRecording);
  const transcribeError = useSessionStore((s) => s.errors.transcribeError);
  const failedAudioChunks = useSessionStore(
    (s) => s.audioChunks.filter((c) => c.status === "error").length
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks.length]);

  const isEmpty = chunks.length === 0 && !isTranscribing;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {isEmpty && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-zinc-500">
            {isRecording
              ? "Waiting for first transcript chunk..."
              : "Start recording to see the transcript here."}
          </p>
        </div>
      )}
      {chunks.map((chunk) => (
        <div key={chunk.id} className="space-y-1">
          <span className="text-[10px] text-zinc-500 font-mono">
            {formatTime(chunk.startTime)}
          </span>
          <p className="text-sm text-zinc-200 leading-relaxed">{chunk.text}</p>
        </div>
      ))}
      {isTranscribing && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Transcribing...
        </div>
      )}
      {transcribeError && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-red-400">{transcribeError}</p>
          {retryTranscription && failedAudioChunks > 0 && (
            <button
              onClick={retryTranscription}
              className="text-xs text-red-400 hover:text-red-200 ml-2 shrink-0"
            >
              Retry ({failedAudioChunks})
            </button>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
