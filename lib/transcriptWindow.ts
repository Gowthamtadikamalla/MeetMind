import { TranscriptChunk } from "@/types/session";

export function getRecentChunks(
  chunks: TranscriptChunk[],
  count: number
): TranscriptChunk[] {
  return chunks.slice(-count);
}

export function formatChunksForPrompt(chunks: TranscriptChunk[]): string {
  if (chunks.length === 0) return "(no transcript yet)";
  return chunks
    .map((c) => `[${c.startTime}] ${c.text}`)
    .join("\n");
}
