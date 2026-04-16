"use client";

import { useSessionStore } from "@/hooks/useSessionStore";
import { DEFAULT_SETTINGS } from "@/lib/prompts";

type Props = {
  open: boolean;
  onClose: () => void;
};

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export default function SettingsDrawer({ open, onClose }: Props) {
  const settings = useSessionStore((s) => s.settings);
  const updateSettings = useSessionStore((s) => s.updateSettings);

  if (!open) return null;

  const handleResetPrompts = () => {
    updateSettings({
      suggestionPrompt: DEFAULT_SETTINGS.suggestionPrompt,
      detailedAnswerPrompt: DEFAULT_SETTINGS.detailedAnswerPrompt,
      chatPrompt: DEFAULT_SETTINGS.chatPrompt,
      summaryPrompt: DEFAULT_SETTINGS.summaryPrompt,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-sm"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <SettingsField
            label="Groq API Key"
            description="Paste your Groq API key. It is stored only in this browser session."
          >
            <input
              type="password"
              value={settings.groqApiKey}
              onChange={(e) =>
                updateSettings({ groqApiKey: e.target.value.trim() })
              }
              placeholder="gsk_..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </SettingsField>

          <SettingsField
            label="Suggestion Context (chunks)"
            description="Number of recent transcript chunks used for live suggestions. Range: 1-20."
          >
            <input
              type="number"
              min={1}
              max={20}
              value={settings.suggestionContextChunks}
              onChange={(e) =>
                updateSettings({
                  suggestionContextChunks: clampInt(e.target.value, 1, 20, 3),
                })
              }
              onBlur={(e) =>
                updateSettings({
                  suggestionContextChunks: clampInt(
                    e.target.value,
                    1,
                    20,
                    settings.suggestionContextChunks
                  ),
                })
              }
              className="w-24 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </SettingsField>

          <SettingsField
            label="Detailed Answer Context (chunks)"
            description="Number of recent transcript chunks used for detailed chat answers. Range: 1-30."
          >
            <input
              type="number"
              min={1}
              max={30}
              value={settings.detailedAnswerContextChunks}
              onChange={(e) =>
                updateSettings({
                  detailedAnswerContextChunks: clampInt(e.target.value, 1, 30, 8),
                })
              }
              onBlur={(e) =>
                updateSettings({
                  detailedAnswerContextChunks: clampInt(
                    e.target.value,
                    1,
                    30,
                    settings.detailedAnswerContextChunks
                  ),
                })
              }
              className="w-24 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </SettingsField>

          <SettingsField
            label="Auto-refresh Interval (ms)"
            description="Audio chunk interval for transcription and auto-refresh. Range: 10000-120000."
          >
            <input
              type="number"
              min={10000}
              max={120000}
              step={5000}
              value={settings.autoRefreshInterval}
              onChange={(e) =>
                updateSettings({
                  autoRefreshInterval: clampInt(e.target.value, 10000, 120000, 30000),
                })
              }
              onBlur={(e) =>
                updateSettings({
                  autoRefreshInterval: clampInt(
                    e.target.value,
                    10000,
                    120000,
                    settings.autoRefreshInterval
                  ),
                })
              }
              className="w-32 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </SettingsField>

          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-300">Prompts</h3>
              <button
                onClick={handleResetPrompts}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Reset to defaults
              </button>
            </div>

            <div className="space-y-6">
              <PromptField
                label="Live Suggestions Prompt"
                description="System prompt for generating the 3 live suggestion cards."
                value={settings.suggestionPrompt}
                onChange={(v) => updateSettings({ suggestionPrompt: v })}
              />

              <PromptField
                label="Detailed Answer Prompt"
                description="System prompt for generating detailed answers when a suggestion is clicked."
                value={settings.detailedAnswerPrompt}
                onChange={(v) => updateSettings({ detailedAnswerPrompt: v })}
              />

              <PromptField
                label="Chat Prompt"
                description="System prompt for direct user questions in the chat."
                value={settings.chatPrompt}
                onChange={(v) => updateSettings({ chatPrompt: v })}
              />

              <PromptField
                label="Summary Prompt"
                description="System prompt for updating the rolling session summary."
                value={settings.summaryPrompt}
                onChange={(v) => updateSettings({ summaryPrompt: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-200">{label}</label>
      <p className="text-xs text-zinc-500">{description}</p>
      {children}
    </div>
  );
}

function PromptField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const isEmpty = value.trim().length === 0;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-200">{label}</label>
      <p className="text-xs text-zinc-500">{description}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className={`w-full bg-zinc-800 border rounded-md px-3 py-2 text-sm text-zinc-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y ${
          isEmpty ? "border-amber-600/50" : "border-zinc-700"
        }`}
      />
      {isEmpty && (
        <p className="text-[11px] text-amber-400">
          Prompt is empty. The model will receive no system instructions.
        </p>
      )}
    </div>
  );
}
