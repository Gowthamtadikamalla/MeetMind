"use client";

import { createContext, useContext } from "react";
import type { ChatMessage } from "@/types/session";

type ChatGenerationContextValue = {
  generateResponse: (userMessage: ChatMessage) => void;
  cancelGeneration: () => void;
  retryLastFailed: () => void;
};

const noop = () => {};

export const ChatGenerationContext = createContext<ChatGenerationContextValue>({
  generateResponse: noop,
  cancelGeneration: noop,
  retryLastFailed: noop,
});

export function useChatGenerationContext(): ChatGenerationContextValue {
  return useContext(ChatGenerationContext);
}
