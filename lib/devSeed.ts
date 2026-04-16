/**
 * DEV-ONLY: Mock data for testing UI layout, auto-scroll, and state flow.
 * Import this in a component or browser console during development.
 * Remove before production deployment.
 */

import type {
  TranscriptChunk,
  SuggestionBatch,
  ChatMessage,
} from "@/types/session";

const now = Date.now();
const t = (offsetMs: number) => new Date(now + offsetMs).toISOString();

export const MOCK_TRANSCRIPT_CHUNKS: TranscriptChunk[] = [
  {
    id: "tc-1",
    sourceAudioChunkId: "ac-1",
    chunkIndex: 0,
    startTime: t(0),
    endTime: t(30000),
    text: "Alright, so the main thing we need to figure out is how to reduce our API latency. Right now the p99 is around 800 milliseconds which is way too high for a real-time product.",
  },
  {
    id: "tc-2",
    sourceAudioChunkId: "ac-2",
    chunkIndex: 1,
    startTime: t(30000),
    endTime: t(60000),
    text: "I think the bottleneck is the suggestion generation pipeline. We're sending too much context to the model each time. Have we looked at using a rolling summary instead of raw transcript?",
  },
  {
    id: "tc-3",
    sourceAudioChunkId: "ac-3",
    chunkIndex: 2,
    startTime: t(60000),
    endTime: t(90000),
    text: "Yeah, I was actually prototyping that yesterday. The summary approach cuts token count by about 60 percent but we lose some granularity. The question is whether suggestion quality holds up.",
  },
  {
    id: "tc-4",
    sourceAudioChunkId: "ac-4",
    chunkIndex: 3,
    startTime: t(90000),
    endTime: t(120000),
    text: "What if we do a hybrid? Keep the last two or three raw chunks for recency plus the rolling summary for broader context. That gives us both freshness and memory without blowing up the context window.",
  },
  {
    id: "tc-5",
    sourceAudioChunkId: "ac-5",
    chunkIndex: 4,
    startTime: t(120000),
    endTime: t(150000),
    text: "That sounds reasonable. Sarah, can you run an A/B test on that? We should compare suggestion relevance scores between the current approach and the hybrid one. Let's target next Wednesday for results.",
  },
];

export const MOCK_SUGGESTION_BATCHES: SuggestionBatch[] = [
  {
    id: "sb-2",
    createdAt: t(120000),
    basedOnChunkIds: ["tc-4", "tc-5"],
    source: "auto",
    suggestions: [
      {
        id: "s-4",
        type: "question_to_ask",
        title: "What metrics for the A/B test?",
        preview:
          "Ask Sarah what specific metrics she plans to use for comparing suggestion relevance between the raw and hybrid approaches.",
        createdAt: t(120000),
      },
      {
        id: "s-5",
        type: "talking_point",
        title: "Token budget for hybrid approach",
        preview:
          "Define a target token budget per suggestion call. The hybrid approach should stay under 2000 tokens of context to keep latency under 400ms.",
        createdAt: t(120000),
      },
      {
        id: "s-6",
        type: "fact_check",
        title: "Verify 60% token reduction claim",
        preview:
          "The 60% reduction figure was from yesterday's prototype. Confirm this holds across different meeting types, not just the test transcript.",
        createdAt: t(120000),
      },
    ],
  },
  {
    id: "sb-1",
    createdAt: t(60000),
    basedOnChunkIds: ["tc-1", "tc-2", "tc-3"],
    source: "auto",
    suggestions: [
      {
        id: "s-1",
        type: "answer",
        title: "Rolling summary approach",
        preview:
          "A rolling summary compresses older transcript into a structured outline (topics, questions, decisions) while keeping recent chunks raw. This typically cuts tokens by 50-70%.",
        createdAt: t(60000),
      },
      {
        id: "s-2",
        type: "clarification",
        title: "What counts as p99 latency here?",
        preview:
          "Clarify whether the 800ms p99 includes just model inference or the full pipeline from audio chunk to rendered suggestions.",
        createdAt: t(60000),
      },
      {
        id: "s-3",
        type: "question_to_ask",
        title: "Have you profiled the pipeline?",
        preview:
          "Ask whether they've broken down the 800ms into transcription time vs. suggestion generation vs. rendering to isolate the real bottleneck.",
        createdAt: t(60000),
      },
    ],
  },
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "cm-1",
    role: "user",
    content:
      "[answer] Rolling summary approach\nA rolling summary compresses older transcript into a structured outline (topics, questions, decisions) while keeping recent chunks raw. This typically cuts tokens by 50-70%.",
    createdAt: t(65000),
    linkedSuggestionId: "s-1",
  },
  {
    id: "cm-2",
    role: "assistant",
    content:
      "A rolling summary works by maintaining a compact structured representation of the conversation that gets updated after each new transcript chunk. Here is how it typically works:\n\n1. After each chunk, the summary is updated to capture: main topics, open questions, decisions, action items, and key entities.\n2. The summary stays under ~300 words regardless of how long the meeting runs.\n3. For suggestion generation, you combine the summary (broad memory) with the last 2-3 raw chunks (recent detail).\n\nThis hybrid gives you both freshness and long-term context awareness while keeping token usage predictable.",
    createdAt: t(67000),
  },
];
