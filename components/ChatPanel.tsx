"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { useSessionStore } from "@/hooks/useSessionStore";
import { useChatGenerationContext } from "@/hooks/useChatGenerationContext";
import MarkdownContent from "./MarkdownContent";
import type { ChatMessage } from "@/types/session";

export default function ChatPanel() {
  const messages = useSessionStore((s) => s.chatMessages);
  const isGenerating = useSessionStore((s) => s.isGeneratingChat);
  const chatError = useSessionStore((s) => s.errors.chatError);
  const addChatMessage = useSessionStore((s) => s.addChatMessage);
  const clearError = useSessionStore((s) => s.clearError);

  const { generateResponse, cancelGeneration, retryLastFailed } =
    useChatGenerationContext();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastContent]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isGenerating) return;

      clearError("chatError");

      const msg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      addChatMessage(msg);
      setInput("");
      generateResponse(msg);
    },
    [input, isGenerating, addChatMessage, clearError, generateResponse]
  );

  const hasFailedAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].isError;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-500 text-center leading-relaxed">
              Click a suggestion or ask a question to start chatting.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : msg.isError
                    ? "bg-zinc-800 text-zinc-200 border border-red-800/50"
                    : "bg-zinc-800 text-zinc-200"
              }`}
            >
              {msg.linkedSuggestionId && msg.role === "user" && (
                <span className="block text-[10px] text-indigo-300/70 mb-1">
                  from suggestion
                </span>
              )}
              {msg.linkedSuggestionId && msg.role === "assistant" && !msg.isError && (
                <span className="block text-[10px] text-zinc-500 mb-1">
                  detailed answer
                </span>
              )}
              {msg.isError && (
                <span className="block text-[10px] text-red-400 mb-1">
                  generation failed
                </span>
              )}
              {msg.content ? (
                msg.role === "assistant" && !msg.isStreaming ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )
              ) : msg.isError ? (
                <p className="text-xs text-zinc-500 italic">No response received.</p>
              ) : null}
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-3 ml-0.5 bg-zinc-400 animate-pulse rounded-sm" />
              )}
            </div>
          </div>
        ))}
        {chatError && !hasFailedAssistant && (
          <p className="text-xs text-red-400 px-1">{chatError}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-zinc-800">
        {isGenerating && (
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Generating...
            </span>
            <button
              onClick={cancelGeneration}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Stop
            </button>
          </div>
        )}
        {hasFailedAssistant && !isGenerating && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-red-400">Response failed.</span>
            <button
              onClick={retryLastFailed}
              className="text-xs text-red-400 hover:text-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the meeting..."
              disabled={isGenerating}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
