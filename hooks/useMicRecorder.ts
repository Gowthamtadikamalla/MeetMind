import { useRef, useCallback, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { useSessionStore } from "./useSessionStore";

const CHUNK_INTERVAL_MS = 30_000;

// Whisper rejects audio shorter than ~0.1s. Use a conservative minimum
// to avoid sending the tiny tail chunk emitted when Stop is clicked.
const MIN_CHUNK_DURATION_MS = 1_000;
const MIN_BLOB_BYTES = 1_000;

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function detectMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "audio/webm";
}

const audioBlobStore = new Map<string, Blob>();

export function getAudioBlob(chunkId: string): Blob | undefined {
  return audioBlobStore.get(chunkId);
}

export function clearAudioBlob(chunkId: string) {
  audioBlobStore.delete(chunkId);
}

export function clearAllAudioBlobs() {
  audioBlobStore.clear();
}

export function useMicRecorder() {
  const isRecording = useSessionStore((s) => s.isRecording);
  const startRecording = useSessionStore((s) => s.startRecording);
  const stopRecordingState = useSessionStore((s) => s.stopRecording);
  const setError = useSessionStore((s) => s.setError);
  const clearError = useSessionStore((s) => s.clearError);
  const addAudioChunk = useSessionStore((s) => s.addAudioChunk);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkStartRef = useRef<string>("");
  const mimeTypeRef = useRef<string>("");
  const isStartingRef = useRef(false);

  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finishChunk = useCallback(
    (blob: Blob) => {
      if (blob.size < MIN_BLOB_BYTES) return;

      const now = new Date().toISOString();
      const startedAt = chunkStartRef.current || now;
      const durationMs = new Date(now).getTime() - new Date(startedAt).getTime();

      // Skip chunks too short for Whisper to process (e.g., tail chunk on Stop)
      if (durationMs < MIN_CHUNK_DURATION_MS) return;

      const id = uuid();

      audioBlobStore.set(id, blob);
      addAudioChunk({
        id,
        startedAt,
        endedAt: now,
        durationMs,
        mimeType: mimeTypeRef.current,
        status: "recorded",
      });

      chunkStartRef.current = now;
    },
    [addAudioChunk]
  );

  const stopAllTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recorderRef.current = null;
    stopAllTracks();
    stopTimer();
    stopRecordingState();
  }, [stopAllTracks, stopTimer, stopRecordingState]);

  /**
   * Flush the current partial chunk without stopping the recording.
   * Calls recorder.requestData() which fires ondataavailable with
   * whatever has been buffered so far, then resets the chunk start time.
   */
  const requestFlush = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.requestData();
    }
  }, []);

  const start = useCallback(async () => {
    if (isStartingRef.current || recorderRef.current) return;
    isStartingRef.current = true;

    try {
      clearError("micError");

      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder API is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      mimeTypeRef.current = detectMimeType();

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeTypeRef.current,
      });

      chunkStartRef.current = new Date().toISOString();

      recorder.ondataavailable = (e: BlobEvent) => {
        finishChunk(e.data);
      };

      recorder.onerror = () => {
        setError("micError", "Recording failed unexpectedly.");
        stop();
      };

      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (recorderRef.current) {
            setError("micError", "Microphone was disconnected.");
            stop();
          }
        };
      });

      recorder.start(CHUNK_INTERVAL_MS);
      recorderRef.current = recorder;

      elapsedRef.current = 0;
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
      }, 1000);

      startRecording();
    } catch (err) {
      stopAllTracks();
      const message = mapMicError(err);
      setError("micError", message);
    } finally {
      isStartingRef.current = false;
    }
  }, [clearError, setError, finishChunk, stop, stopAllTracks, startRecording]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    start,
    stop,
    requestFlush,
    isRecording,
    elapsedRef,
  };
}

function mapMicError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Microphone permission was denied. Please allow access and try again.";
      case "NotFoundError":
        return "No microphone found. Please connect a microphone and try again.";
      case "NotReadableError":
        return "Microphone is already in use by another application.";
      case "AbortError":
        return "Microphone access was aborted.";
      default:
        return `Microphone error: ${err.message}`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unknown microphone error occurred.";
}
