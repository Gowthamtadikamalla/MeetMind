import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { SuggestionsWithSummarySchema } from "@/lib/schemas";
import { buildSuggestionMessages } from "@/lib/suggestionPromptBuilder";
import { CHAT_MODEL } from "@/lib/models";

export const runtime = "nodejs";

export type SuggestionsRequestBody = {
  apiKey?: string;
  recentTranscript: string;
  rollingSummary: string;
  recentSuggestions: string;
  systemPrompt: string;
};

export type SuggestionsApiResponse = {
  suggestions: Array<{
    type: string;
    title: string;
    preview: string;
  }>;
  updatedSummary: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: SuggestionsRequestBody = await req.json();

    const apiKey = resolveApiKey(body.apiKey ?? null);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing or empty Groq API key." },
        { status: 400 }
      );
    }

    const transcript = (body.recentTranscript ?? "").trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript content to generate suggestions from." },
        { status: 400 }
      );
    }

    const messages = buildSuggestionMessages({
      systemPrompt: body.systemPrompt,
      recentTranscript: transcript,
      rollingSummary: body.rollingSummary ?? "",
      recentSuggestions: body.recentSuggestions ?? "",
    });

    const groq = getGroqClient(apiKey);

    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON.", raw },
        { status: 502 }
      );
    }

    const result = SuggestionsWithSummarySchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Model response did not match the required schema.",
          details: result.error.issues,
          raw,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      suggestions: result.data.suggestions,
      updatedSummary: result.data.updatedSummary,
    } satisfies SuggestionsApiResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Suggestion generation failed.";
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
