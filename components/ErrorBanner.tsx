"use client";

import { useSessionStore } from "@/hooks/useSessionStore";
import { useHasMounted } from "@/hooks/useHasMounted";
import type { SessionErrors } from "@/types/session";

const LABELS: Record<keyof SessionErrors, string> = {
  micError: "Microphone",
  transcribeError: "Transcription",
  suggestionsError: "Suggestions",
  chatError: "Chat",
};

export default function ErrorBanner() {
  const errors = useSessionStore((s) => s.errors);
  const clearError = useSessionStore((s) => s.clearError);
  const mounted = useHasMounted();

  if (!mounted) return null;

  const activeErrors = (Object.keys(LABELS) as (keyof SessionErrors)[]).filter(
    (key) => errors[key] !== null
  );

  if (activeErrors.length === 0) return null;

  return (
    <div className="px-6 py-2 bg-red-950/60 border-b border-red-900/50 flex items-center justify-between gap-4 shrink-0">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {activeErrors.map((key) => (
          <span key={key} className="text-xs text-red-300">
            <span className="font-medium">{LABELS[key]}:</span> {errors[key]}
          </span>
        ))}
      </div>
      <button
        onClick={() => activeErrors.forEach((key) => clearError(key))}
        className="text-xs text-red-400 hover:text-red-200 shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}
