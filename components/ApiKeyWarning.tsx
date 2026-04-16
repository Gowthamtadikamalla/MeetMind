"use client";

import { useSessionStore } from "@/hooks/useSessionStore";
import { useHasMounted } from "@/hooks/useHasMounted";

type Props = {
  onOpenSettings: () => void;
};

export default function ApiKeyWarning({ onOpenSettings }: Props) {
  const apiKey = useSessionStore((s) => s.settings.groqApiKey);
  const mounted = useHasMounted();

  if (!mounted || apiKey.trim().length > 0) return null;

  return (
    <div className="px-6 py-2 bg-amber-950/50 border-b border-amber-900/40 flex items-center justify-between shrink-0">
      <span className="text-xs text-amber-300">
        No Groq API key set. Add your key in Settings to enable transcription and suggestions.
      </span>
      <button
        onClick={onOpenSettings}
        className="text-xs text-amber-400 hover:text-amber-200 font-medium shrink-0"
      >
        Open Settings
      </button>
    </div>
  );
}
