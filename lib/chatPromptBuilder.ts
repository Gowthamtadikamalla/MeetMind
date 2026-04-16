import type { ChatMessage, SuggestionClickMeta } from "@/types/session";

type ChatPromptInput = {
  systemPrompt: string;
  recentTranscript: string;
  rollingSummary: string;
  chatHistory: ChatMessage[];
  userMessage: string;
  suggestionMeta?: SuggestionClickMeta;
};

type PromptMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_HISTORY_MESSAGES = 20;

export function buildChatMessages(input: ChatPromptInput): PromptMessage[] {
  const {
    systemPrompt,
    recentTranscript,
    rollingSummary,
    chatHistory,
    userMessage,
    suggestionMeta,
  } = input;

  const messages: PromptMessage[] = [];

  const contextParts: string[] = [systemPrompt];

  if (rollingSummary) {
    contextParts.push(`\n## Session Summary\n${rollingSummary}`);
  }

  if (recentTranscript && recentTranscript !== "(no transcript yet)") {
    contextParts.push(`\n## Recent Transcript\n${recentTranscript}`);
  }

  messages.push({ role: "system", content: contextParts.join("\n") });

  const historySlice = chatHistory.slice(-MAX_HISTORY_MESSAGES);
  for (const msg of historySlice) {
    if (msg.isStreaming) continue;
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  if (suggestionMeta) {
    const userContent = buildSuggestionExpansionRequest(
      userMessage,
      suggestionMeta
    );
    messages.push({ role: "user", content: userContent });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  return messages;
}

function buildSuggestionExpansionRequest(
  originalContent: string,
  meta: SuggestionClickMeta
): string {
  return [
    `The user clicked a live suggestion and wants a detailed expansion.`,
    ``,
    `Suggestion type: ${meta.suggestionType.replace(/_/g, " ")}`,
    `Suggestion title: ${meta.suggestionTitle}`,
    ``,
    `Original suggestion content:`,
    originalContent,
    ``,
    `Expand this suggestion into a detailed, context-grounded answer.`,
    `Use the transcript and session summary above as your primary source.`,
    `Be direct, specific, and practical. Structure for quick scanning.`,
    `If the transcript lacks enough context, say so honestly.`,
  ].join("\n");
}
