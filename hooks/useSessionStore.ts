import { create } from "zustand";
import {
  SessionState,
  SessionErrors,
  TranscriptChunk,
  SuggestionBatch,
  ChatMessage,
  AudioChunkStatus,
  SessionSettings,
} from "@/types/session";
import { DEFAULT_SETTINGS } from "@/lib/prompts";

const initialErrors: SessionErrors = {
  micError: null,
  transcribeError: null,
  suggestionsError: null,
  chatError: null,
};

const initialState: SessionState = {
  transcriptChunks: [],
  suggestionBatches: [],
  chatMessages: [],
  audioChunks: [],
  audioChunkCounter: 0,
  lastSuggestedTranscriptCount: 0,
  lastSuggestedChunkIndex: -1,
  lastSuggestedBasisSignature: "",
  rollingSessionSummary: "",
  settings: { ...DEFAULT_SETTINGS },
  errors: { ...initialErrors },
  sessionStartedAt: null,
  sessionEndedAt: null,
  isRecording: false,
  isTranscribing: false,
  isGeneratingSuggestions: false,
  isGeneratingChat: false,
};

type SessionActions = {
  setRecording: (isRecording: boolean) => void;
  setTranscribing: (isTranscribing: boolean) => void;
  setGeneratingSuggestions: (isGenerating: boolean) => void;
  setGeneratingChat: (isGenerating: boolean) => void;
  setError: (key: keyof SessionErrors, message: string | null) => void;
  clearError: (key: keyof SessionErrors) => void;
  clearErrors: () => void;
  addTranscriptChunk: (chunk: TranscriptChunk) => void;
  addSuggestionBatch: (batch: SuggestionBatch) => void;
  setLastSuggestedTranscriptCount: (count: number) => void;
  setLastSuggestedChunkIndex: (index: number) => void;
  setLastSuggestedBasisSignature: (sig: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessage: (id: string, content: string) => void;
  appendToChatMessage: (id: string, token: string) => void;
  setChatMessageStreaming: (id: string, isStreaming: boolean) => void;
  markChatMessageError: (id: string) => void;
  removeLastChatMessages: (count: number) => void;
  addAudioChunk: (chunk: Omit<import("@/types/session").AudioChunkMeta, "chunkIndex">) => void;
  updateAudioChunkStatus: (id: string, status: AudioChunkStatus, errorMessage?: string) => void;
  setRollingSessionSummary: (summary: string) => void;
  updateSettings: (settings: Partial<SessionSettings>) => void;
  startRecording: () => void;
  stopRecording: () => void;
  endSession: () => void;
  resetSession: () => void;
};

export type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  setRecording: (isRecording) => set({ isRecording }),

  setTranscribing: (isTranscribing) => set({ isTranscribing }),

  setGeneratingSuggestions: (isGenerating) =>
    set({ isGeneratingSuggestions: isGenerating }),

  setGeneratingChat: (isGenerating) =>
    set({ isGeneratingChat: isGenerating }),

  setError: (key, message) =>
    set((s) => ({ errors: { ...s.errors, [key]: message } })),

  clearError: (key) =>
    set((s) => ({ errors: { ...s.errors, [key]: null } })),

  clearErrors: () => set({ errors: { ...initialErrors } }),

  addTranscriptChunk: (chunk) =>
    set((s) => ({ transcriptChunks: [...s.transcriptChunks, chunk] })),

  addSuggestionBatch: (batch) =>
    set((s) => ({ suggestionBatches: [batch, ...s.suggestionBatches] })),

  setLastSuggestedTranscriptCount: (count) =>
    set({ lastSuggestedTranscriptCount: count }),

  setLastSuggestedChunkIndex: (index) =>
    set({ lastSuggestedChunkIndex: index }),

  setLastSuggestedBasisSignature: (sig) =>
    set({ lastSuggestedBasisSignature: sig }),

  addChatMessage: (message) =>
    set((s) => ({ chatMessages: [...s.chatMessages, message] })),

  updateChatMessage: (id, content) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    })),

  appendToChatMessage: (id, token) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m
      ),
    })),

  setChatMessageStreaming: (id, isStreaming) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, isStreaming } : m
      ),
    })),

  markChatMessageError: (id) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, isStreaming: false, isError: true } : m
      ),
    })),

  removeLastChatMessages: (count) =>
    set((s) => ({
      chatMessages: s.chatMessages.slice(0, -count),
    })),

  addAudioChunk: (chunk) =>
    set((s) => {
      const chunkIndex = s.audioChunkCounter;
      return {
        audioChunks: [...s.audioChunks, { ...chunk, chunkIndex }],
        audioChunkCounter: chunkIndex + 1,
      };
    }),

  updateAudioChunkStatus: (id, status, errorMessage) =>
    set((s) => ({
      audioChunks: s.audioChunks.map((c) =>
        c.id === id
          ? { ...c, status, ...(errorMessage !== undefined ? { errorMessage } : {}) }
          : c
      ),
    })),

  setRollingSessionSummary: (summary) =>
    set({ rollingSessionSummary: summary }),

  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),

  startRecording: () =>
    set((s) => ({
      sessionStartedAt: s.sessionStartedAt ?? new Date().toISOString(),
      isRecording: true,
      errors: { ...s.errors, micError: null },
    })),

  stopRecording: () =>
    set({ isRecording: false }),

  endSession: () =>
    set({ sessionEndedAt: new Date().toISOString(), isRecording: false }),

  resetSession: () =>
    set((s) => ({
      ...initialState,
      // Deliberately preserve all settings (including API key) across "New Session".
      // The key lives only in memory and is never persisted or exported.
      settings: s.settings,
    })),
}));
