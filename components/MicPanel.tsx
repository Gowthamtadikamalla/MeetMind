"use client";

import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/hooks/useSessionStore";
import { useMicRecorderContext } from "@/hooks/useMicRecorderContext";

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Subscribes to a 1-second timer that reads elapsedRef and re-renders
 * via useSyncExternalStore to avoid setState-in-effect lint issues.
 */
function useElapsedDisplay(isRecording: boolean, elapsedRef: React.MutableRefObject<number>): string {
  const listenersRef = useRef(new Set<() => void>());
  const snapshotRef = useRef("");

  useEffect(() => {
    const listeners = listenersRef.current;
    if (!isRecording) {
      snapshotRef.current = "";
      listeners.forEach((cb) => cb());
      return undefined;
    }
    const id = setInterval(() => {
      const next = formatElapsed(elapsedRef.current);
      if (next !== snapshotRef.current) {
        snapshotRef.current = next;
        listeners.forEach((cb) => cb());
      }
    }, 1000);
    return () => {
      clearInterval(id);
      snapshotRef.current = "";
      listeners.forEach((cb) => cb());
    };
  }, [isRecording, elapsedRef]);

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);
  const getSnapshot = useCallback(() => snapshotRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export default function MicPanel() {
  const isRecording = useSessionStore((s) => s.isRecording);
  const micError = useSessionStore((s) => s.errors.micError);
  const { start, stop, elapsedRef } = useMicRecorderContext();
  const displayElapsed = useElapsedDisplay(isRecording, elapsedRef);

  const handleToggle = () => {
    if (isRecording) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 shrink-0">
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isRecording
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-indigo-600 hover:bg-indigo-700 text-white"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isRecording ? "bg-red-300 animate-pulse" : "bg-white/80"
          }`}
        />
        {isRecording ? "Stop" : "Start Recording"}
      </button>
      {isRecording && displayElapsed && (
        <span className="text-xs text-zinc-400 tabular-nums">{displayElapsed}</span>
      )}
      {isRecording && (
        <span className="text-xs text-zinc-500">Listening...</span>
      )}
      {micError && (
        <span className="text-xs text-red-400 truncate max-w-[240px]">{micError}</span>
      )}
    </div>
  );
}
