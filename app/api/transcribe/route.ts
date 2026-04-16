import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { TRANSCRIPTION_MODEL } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const apiKey = resolveApiKey(formData.get("apiKey") as string | null);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing or empty Groq API key." },
        { status: 400 }
      );
    }

    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "Missing audio file in request." },
        { status: 400 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: "Audio file is empty." },
        { status: 400 }
      );
    }

    const groq = getGroqClient(apiKey);

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIPTION_MODEL,
      response_format: "verbose_json",
      language: "en",
    });

    const text = transcription.text?.trim() ?? "";

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transcription failed.";

    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
