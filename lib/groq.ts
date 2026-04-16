import Groq from "groq-sdk";

let cachedClient: Groq | null = null;
let cachedKey: string = "";

export function getGroqClient(apiKey: string): Groq {
  if (cachedClient && cachedKey === apiKey) {
    return cachedClient;
  }
  cachedClient = new Groq({ apiKey });
  cachedKey = apiKey;
  return cachedClient;
}
