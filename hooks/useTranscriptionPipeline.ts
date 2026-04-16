import { useEffect, useRef, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { useSessionStore } from "./useSessionStore";
import { getAudioBlob, clearAudioBlob } from "./useMicRecorder";
import type { AudioChunkMeta } from "@/types/session";

/**
 * Watches for audio chunks with status "recorded", then processes them
 * sequentially through: recorded -> queued -> transcribing -> done | error.
 *
 * Creates a TranscriptChunk for each successful transcription and appends
 * it to the session store.
 */
export function useTranscriptionPipeline() {
  const audioChunks = useSessionStore((s) => s.audioChunks);
  const updateAudioChunkStatus = useSessionStore((s) => s.updateAudioChunkStatus);
  const addTranscriptChunk = useSessionStore((s) => s.addTranscriptChunk);
  const setTranscribing = useSessionStore((s) => s.setTranscribing);
  const setError = useSessionStore((s) => s.setError);
  const clearError = useSessionStore((s) => s.clearError);

  const isProcessingRef = useRef(false);

  const processNextChunk = useCallback(async () => {
    if (isProcessingRef.current) return;

    const chunks = useSessionStore.getState().audioChunks;
    const key = useSessionStore.getState().settings.groqApiKey;

    // Find the first chunk in "recorded" status, sorted by chunkIndex
    const nextChunk = chunks
      .filter((c) => c.status === "recorded")
      .sort((a, b) => a.chunkIndex - b.chunkIndex)[0];

    if (!nextChunk) return;

    isProcessingRef.current = true;
    clearError("transcribeError");
    setTranscribing(true);

    updateAudioChunkStatus(nextChunk.id, "queued");
    updateAudioChunkStatus(nextChunk.id, "transcribing");

    try {
      const blob = getAudioBlob(nextChunk.id);
      if (!blob) {
        throw new Error("Audio blob not found for chunk.");
      }

      const text = await transcribeAudioChunk(blob, nextChunk, key);

      updateAudioChunkStatus(nextChunk.id, "done");

      // Blob is safe to remove after successful transcription
      clearAudioBlob(nextChunk.id);

      if (text.trim()) {
        addTranscriptChunk({
          id: uuid(),
          sourceAudioChunkId: nextChunk.id,
          chunkIndex: nextChunk.chunkIndex,
          startTime: nextChunk.startedAt,
          endTime: nextChunk.endedAt,
          text: text.trim(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transcription failed.";
      updateAudioChunkStatus(nextChunk.id, "error", message);
      setError("transcribeError", message);
      // Blob is kept for retry
    } finally {
      isProcessingRef.current = false;
      setTranscribing(false);
    }
  }, [updateAudioChunkStatus, addTranscriptChunk, setTranscribing, setError, clearError]);

  // React to audio chunk changes -- trigger processing when new recorded chunks appear
  useEffect(() => {
    const hasRecorded = audioChunks.some((c) => c.status === "recorded");
    if (hasRecorded && !isProcessingRef.current) {
      processNextChunk();
    }
  }, [audioChunks, processNextChunk]);

  // After finishing one chunk, check if there are more to process
  useEffect(() => {
    if (isProcessingRef.current) return;
    const hasRecorded = audioChunks.some((c) => c.status === "recorded");
    if (hasRecorded) {
      processNextChunk();
    }
  }, [audioChunks, processNextChunk]);

  const retryFailed = useCallback(() => {
    const chunks = useSessionStore.getState().audioChunks;
    const failedChunks = chunks
      .filter((c) => c.status === "error")
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    for (const chunk of failedChunks) {
      if (getAudioBlob(chunk.id)) {
        updateAudioChunkStatus(chunk.id, "recorded");
      }
    }
  }, [updateAudioChunkStatus]);

  return { retryFailed };
}

async function transcribeAudioChunk(
  blob: Blob,
  meta: AudioChunkMeta,
  apiKey: string
): Promise<string> {
  const ext = mimeToExtension(meta.mimeType);
  const file = new File([blob], `chunk.${ext}`, { type: meta.mimeType });

  const formData = new FormData();
  formData.append("audio", file);
  formData.append("apiKey", apiKey);

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `Transcription failed (${res.status})`);
  }

  return json.text ?? "";
}

function mimeToExtension(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}
