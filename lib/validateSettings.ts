import type { SessionSettings } from "@/types/session";
import { DEFAULT_SETTINGS } from "./prompts";

/**
 * Normalizes and validates settings at the state/request boundary.
 * Returns a safe copy with all values clamped and trimmed.
 * Called before any API request that uses settings values.
 */
export function normalizeSettings(raw: SessionSettings): SessionSettings {
  return {
    groqApiKey: (raw.groqApiKey ?? "").trim(),
    suggestionPrompt: raw.suggestionPrompt?.trim() || DEFAULT_SETTINGS.suggestionPrompt,
    detailedAnswerPrompt: raw.detailedAnswerPrompt?.trim() || DEFAULT_SETTINGS.detailedAnswerPrompt,
    chatPrompt: raw.chatPrompt?.trim() || DEFAULT_SETTINGS.chatPrompt,
    summaryPrompt: raw.summaryPrompt?.trim() || DEFAULT_SETTINGS.summaryPrompt,
    suggestionContextChunks: clampInt(raw.suggestionContextChunks, 1, 20, 3),
    detailedAnswerContextChunks: clampInt(raw.detailedAnswerContextChunks, 1, 30, 8),
    autoRefreshInterval: clampInt(raw.autoRefreshInterval, 10000, 120000, 30000),
    maxPreviewLength: clampInt(raw.maxPreviewLength, 50, 1000, 200),
    maxAnswerLength: clampInt(raw.maxAnswerLength, 200, 5000, 1500),
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
