import { v4 as uuid } from "uuid";
import type {
  TranscriptChunk,
  SuggestionBatch,
  Suggestion,
  SessionSettings,
} from "@/types/session";
import { getRecentChunks, formatChunksForPrompt } from "./transcriptWindow";
import { formatRecentSuggestionsForPrompt } from "./suggestionDedupe";
import { normalizeSettings } from "./validateSettings";
import type { SuggestionsApiResponse } from "@/app/api/suggestions/route";

type GenerateSuggestionsInput = {
  transcriptChunks: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  rollingSummary: string;
  settings: SessionSettings;
  source: "auto" | "manual";
};

type GenerateSuggestionsResult = {
  batch: SuggestionBatch;
  updatedSummary: string;
};

export async function generateSuggestionBatch(
  input: GenerateSuggestionsInput
): Promise<GenerateSuggestionsResult> {
  const { transcriptChunks, suggestionBatches, rollingSummary, source } = input;
  const settings = normalizeSettings(input.settings);

  const contextChunks = getRecentChunks(transcriptChunks, settings.suggestionContextChunks);
  const recentTranscript = formatChunksForPrompt(contextChunks);
  const recentSuggestions = formatRecentSuggestionsForPrompt(suggestionBatches, 2);

  const res = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: settings.groqApiKey,
      recentTranscript,
      rollingSummary,
      recentSuggestions,
      systemPrompt: settings.suggestionPrompt,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `Suggestion generation failed (${res.status})`);
  }

  const apiResponse = json as SuggestionsApiResponse;

  const now = new Date().toISOString();
  const suggestions: Suggestion[] = apiResponse.suggestions.map((s) => ({
    id: uuid(),
    type: s.type as Suggestion["type"],
    title: s.title,
    preview: s.preview,
    createdAt: now,
  }));

  const batch: SuggestionBatch = {
    id: uuid(),
    createdAt: now,
    basedOnChunkIds: contextChunks.map((c) => c.id),
    source,
    suggestions,
  };

  return {
    batch,
    updatedSummary: apiResponse.updatedSummary,
  };
}
