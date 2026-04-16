export type SuggestionType =
  | "answer"
  | "question_to_ask"
  | "talking_point"
  | "fact_check"
  | "clarification";

export type TranscriptChunk = {
  id: string;
  sourceAudioChunkId: string;
  chunkIndex: number;
  startTime: string;
  endTime: string;
  text: string;
};

export type Suggestion = {
  id: string;
  type: SuggestionType;
  title: string;
  preview: string;
  createdAt: string;
};

export type SuggestionBatch = {
  id: string;
  createdAt: string;
  basedOnChunkIds: string[];
  source: "auto" | "manual";
  suggestions: Suggestion[];
};

export type AudioChunkStatus =
  | "recorded"
  | "queued"
  | "transcribing"
  | "done"
  | "error";

export type AudioChunkMeta = {
  id: string;
  chunkIndex: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  mimeType: string;
  status: AudioChunkStatus;
  errorMessage?: string;
};

export type SuggestionClickMeta = {
  suggestionId: string;
  suggestionType: SuggestionType;
  suggestionTitle: string;
  suggestionBatchId: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  linkedSuggestionId?: string;
  suggestionMeta?: SuggestionClickMeta;
  isStreaming?: boolean;
  isError?: boolean;
};

export type SessionSettings = {
  groqApiKey: string;
  suggestionPrompt: string;
  detailedAnswerPrompt: string;
  chatPrompt: string;
  summaryPrompt: string;
  suggestionContextChunks: number;
  detailedAnswerContextChunks: number;
  autoRefreshInterval: number;
  maxPreviewLength: number;
  maxAnswerLength: number;
};

export type SessionErrors = {
  micError: string | null;
  transcribeError: string | null;
  suggestionsError: string | null;
  chatError: string | null;
};

export type SessionState = {
  transcriptChunks: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
  audioChunks: AudioChunkMeta[];
  audioChunkCounter: number;
  lastSuggestedTranscriptCount: number;
  lastSuggestedChunkIndex: number;
  lastSuggestedBasisSignature: string;
  rollingSessionSummary: string;
  settings: SessionSettings;
  errors: SessionErrors;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  isRecording: boolean;
  isTranscribing: boolean;
  isGeneratingSuggestions: boolean;
  isGeneratingChat: boolean;
};
