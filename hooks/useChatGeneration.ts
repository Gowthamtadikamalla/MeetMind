import { useRef, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { useSessionStore } from "./useSessionStore";
import { buildChatMessages } from "@/lib/chatPromptBuilder";
import { streamChatResponse } from "@/lib/streamChatResponse";
import { getRecentChunks, formatChunksForPrompt } from "@/lib/transcriptWindow";
import { normalizeSettings } from "@/lib/validateSettings";
import type { ChatMessage, SuggestionClickMeta } from "@/types/session";

/**
 * Encapsulates streaming chat generation. Provides:
 *  - generateResponse: explicit trigger for a user message
 *  - cancelGeneration: abort the current stream
 *  - retryLastFailed: remove the failed pair and re-generate
 */
export function useChatGeneration() {
  const abortRef = useRef<AbortController | null>(null);

  const generateResponse = useCallback((userMessage: ChatMessage) => {
    const store = useSessionStore.getState();
    if (store.isGeneratingChat) return;

    const settings = normalizeSettings(store.settings);

    const isSuggestionClick = !!userMessage.suggestionMeta;
    const systemPrompt = isSuggestionClick
      ? settings.detailedAnswerPrompt
      : settings.chatPrompt;

    const contextSize = settings.detailedAnswerContextChunks;
    const contextChunks = getRecentChunks(store.transcriptChunks, contextSize);
    const recentTranscript = formatChunksForPrompt(contextChunks);

    const previousMessages = store.chatMessages.filter(
      (m) => m.id !== userMessage.id && !m.isError
    );

    const promptMessages = buildChatMessages({
      systemPrompt,
      recentTranscript,
      rollingSummary: store.rollingSessionSummary,
      chatHistory: previousMessages,
      userMessage: userMessage.content,
      suggestionMeta: userMessage.suggestionMeta as SuggestionClickMeta | undefined,
    });

    const assistantId = uuid();

    store.addChatMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      linkedSuggestionId: userMessage.linkedSuggestionId,
      isStreaming: true,
    });

    store.setGeneratingChat(true);
    store.clearError("chatError");

    const abort = streamChatResponse(
      {
        apiKey: settings.groqApiKey,
        messages: promptMessages,
      },
      {
        onToken: (token) => {
          useSessionStore.getState().appendToChatMessage(assistantId, token);
        },
        onDone: () => {
          useSessionStore.getState().setChatMessageStreaming(assistantId, false);
          useSessionStore.getState().setGeneratingChat(false);
          abortRef.current = null;
        },
        onError: (message) => {
          useSessionStore.getState().markChatMessageError(assistantId);
          useSessionStore.getState().setGeneratingChat(false);
          useSessionStore.getState().setError("chatError", message);
          abortRef.current = null;
        },
      }
    );

    abortRef.current = abort;
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    useSessionStore.getState().setGeneratingChat(false);
    const msgs = useSessionStore.getState().chatMessages;
    const streaming = msgs.find((m) => m.isStreaming);
    if (streaming) {
      useSessionStore.getState().setChatMessageStreaming(streaming.id, false);
    }
  }, []);

  /**
   * Remove the last failed assistant message (and optionally its user message),
   * then re-generate from the user message.
   */
  const retryLastFailed = useCallback(() => {
    const store = useSessionStore.getState();
    if (store.isGeneratingChat) return;

    const msgs = store.chatMessages;
    if (msgs.length === 0) return;

    const last = msgs[msgs.length - 1];
    if (last.role !== "assistant" || !last.isError) return;

    const userMsg = msgs.length >= 2 ? msgs[msgs.length - 2] : null;
    if (!userMsg || userMsg.role !== "user") return;

    store.removeLastChatMessages(1);
    store.clearError("chatError");

    setTimeout(() => {
      const freshStore = useSessionStore.getState();
      const freshUserMsg = freshStore.chatMessages[freshStore.chatMessages.length - 1];
      if (freshUserMsg && freshUserMsg.role === "user") {
        generateResponse(freshUserMsg);
      }
    }, 0);
  }, [generateResponse]);

  return { generateResponse, cancelGeneration, retryLastFailed };
}
