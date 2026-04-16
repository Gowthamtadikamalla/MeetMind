import { SuggestionBatch } from "@/types/session";

export function formatRecentSuggestionsForPrompt(
  batches: SuggestionBatch[],
  count: number = 2
): string {
  const recent = batches.slice(0, count);
  if (recent.length === 0) return "(no prior suggestions)";

  return recent
    .map((batch) =>
      batch.suggestions
        .map((s) => `- [${s.type}] ${s.title}: ${s.preview}`)
        .join("\n")
    )
    .join("\n---\n");
}
