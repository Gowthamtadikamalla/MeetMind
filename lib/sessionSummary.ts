/**
 * Rolling session summary is updated inline within /api/suggestions
 * to avoid a separate LLM round trip. The updatedSummary field is
 * returned alongside suggestions and stored via setRollingSessionSummary.
 *
 * This file is preserved for potential future use if a standalone
 * summary update path becomes desirable (e.g. for very long sessions
 * where suggestion generation is paused but summary should still update).
 */

export function buildSummaryUpdateMessages(
  currentSummary: string,
  newChunkText: string,
  systemPrompt: string
): { role: "system" | "user"; content: string }[] {
  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  if (currentSummary) {
    messages.push({
      role: "user",
      content: `Current summary:\n${currentSummary}\n\nNew transcript chunk:\n${newChunkText}\n\nUpdate the summary.`,
    });
  } else {
    messages.push({
      role: "user",
      content: `First transcript chunk:\n${newChunkText}\n\nCreate the initial summary.`,
    });
  }

  return messages;
}
