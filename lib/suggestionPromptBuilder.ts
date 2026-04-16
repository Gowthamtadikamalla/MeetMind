type SuggestionPromptInput = {
  systemPrompt: string;
  recentTranscript: string;
  rollingSummary: string;
  recentSuggestions: string;
};

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

const OUTPUT_SCHEMA_DESCRIPTION = `You MUST respond with a single valid JSON object matching this exact schema:

{
  "updatedSummary": "<string, a compact updated rolling summary of the conversation so far, max 300 words>",
  "suggestions": [
    {
      "type": "<one of: answer, question_to_ask, talking_point, fact_check, clarification>",
      "title": "<string, short actionable title, max 120 chars>",
      "preview": "<string, useful standalone preview text, max 500 chars>"
    },
    { ... },
    { ... }
  ]
}

CRITICAL RULES:
- Return EXACTLY 3 suggestions in the array. Not 2, not 4. Exactly 3.
- Each suggestion type must be one of: answer, question_to_ask, talking_point, fact_check, clarification
- updatedSummary must capture the current state of the conversation concisely.
- Return ONLY the JSON object, no markdown, no explanation, no wrapping.`;

export function buildSuggestionMessages(input: SuggestionPromptInput): ChatMessage[] {
  const { systemPrompt, recentTranscript, rollingSummary, recentSuggestions } = input;

  const systemContent = [
    systemPrompt,
    "",
    OUTPUT_SCHEMA_DESCRIPTION,
  ].join("\n");

  const userParts: string[] = [];

  if (rollingSummary) {
    userParts.push(`## Session Summary So Far\n${rollingSummary}`);
  }

  userParts.push(`## Recent Transcript\n${recentTranscript}`);

  if (recentSuggestions && recentSuggestions !== "(no prior suggestions)") {
    userParts.push(
      `## Recent Prior Suggestions (avoid repeating these)\n${recentSuggestions}`
    );
  }

  userParts.push(
    "Generate exactly 3 fresh, specific, useful suggestions based on the transcript above. " +
    "Also update the rolling summary. Respond with ONLY valid JSON."
  );

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userParts.join("\n\n") },
  ];
}
