/**
 * Resolves the Groq API key with correct priority:
 *   1. User-provided key from the request (settings screen)
 *   2. process.env.GROQ_API_KEY (local dev fallback only)
 *
 * Returns the resolved key or null if none available.
 */
export function resolveApiKey(requestKey: string | null | undefined): string | null {
  if (requestKey && typeof requestKey === "string" && requestKey.trim()) {
    return requestKey.trim();
  }
  const envKey = process.env.GROQ_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  return null;
}
