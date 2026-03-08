import { NextResponse } from "next/server";
import { OllamaClient } from "@/modules/providers/lib/ollama";

export async function GET() {
  const client = new OllamaClient(
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"
  );

  const connected = await client.isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Ollama unreachable" },
      { status: 503 }
    );
  }

  const models = await client.listModels();
  return NextResponse.json({ models });
}
