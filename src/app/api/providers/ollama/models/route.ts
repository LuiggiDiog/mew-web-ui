import { NextResponse } from "next/server";
import { OllamaClient } from "@/modules/providers/services/ollama";
import { env } from "@/env";
import { DEFAULT_MODEL } from "@/modules/shared/constants";

export async function GET() {
  const client = new OllamaClient(env.ollamaBaseUrl);

  const connected = await client.isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Ollama unreachable" },
      { status: 503 }
    );
  }

  const models = await client.listModels();
  const testOnlyMode = env.ollamaTestOnlyModelEnabled;
  const filteredModels = testOnlyMode
    ? models.filter((model) => model.name === DEFAULT_MODEL)
    : models;
  return NextResponse.json({ models: filteredModels });
}
