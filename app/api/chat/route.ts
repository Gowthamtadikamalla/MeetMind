import { NextRequest } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { CHAT_MODEL } from "@/lib/models";

export const runtime = "nodejs";

export type ChatRequestBody = {
  apiKey?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
};

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();

    const apiKey = resolveApiKey(body.apiKey ?? null);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing or empty Groq API key." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.messages || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const groq = getGroqClient(apiKey);

    const stream = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: body.messages,
      temperature: 0.6,
      max_completion_tokens: 2000,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: delta })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream error.";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Chat request failed.";
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
