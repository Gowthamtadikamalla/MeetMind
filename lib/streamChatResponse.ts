import type { ChatRequestBody } from "@/app/api/chat/route";

type StreamCallbacks = {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

/**
 * Calls /api/chat and streams tokens back via SSE.
 * Returns an AbortController so the caller can cancel mid-stream.
 */
export function streamChatResponse(
  body: ChatRequestBody,
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorMsg = `Chat request failed (${res.status})`;
        try {
          const json = await res.json();
          if (json.error) errorMsg = json.error;
        } catch {
          // response body was not JSON
        }
        callbacks.onError(errorMsg);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError("No response stream available.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);

          if (payload === "[DONE]") {
            callbacks.onDone();
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              callbacks.onError(parsed.error);
              return;
            }
            if (parsed.token) {
              callbacks.onToken(parsed.token);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      callbacks.onDone();
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Chat stream interrupted.";
      callbacks.onError(message);
    }
  })();

  return controller;
}
