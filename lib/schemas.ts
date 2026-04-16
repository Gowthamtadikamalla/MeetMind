import { z } from "zod";

export const SUGGESTION_TYPES = [
  "answer",
  "question_to_ask",
  "talking_point",
  "fact_check",
  "clarification",
] as const;

export const SuggestionSchema = z.object({
  type: z.enum(SUGGESTION_TYPES),
  title: z.string().min(1).max(120),
  preview: z.string().min(1).max(500),
});

export const SuggestionsResponseSchema = z.object({
  suggestions: z.tuple([SuggestionSchema, SuggestionSchema, SuggestionSchema]),
});

export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>;

export const SuggestionsWithSummarySchema = z.object({
  updatedSummary: z.string().max(2000),
  suggestions: z.tuple([SuggestionSchema, SuggestionSchema, SuggestionSchema]),
});

export type SuggestionsWithSummaryResponse = z.infer<typeof SuggestionsWithSummarySchema>;

export const TranscribeResponseSchema = z.object({
  text: z.string(),
});
