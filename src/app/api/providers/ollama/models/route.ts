import { NextResponse } from "next/server";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { env } from "@/env";

const TEST_ONLY_MODEL =
  "hf.co/mradermacher/Dolphin-Mistral-24B-Venice-Edition-GGUF:Q4_K_M";

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
    ? models.filter((model) => model.name === TEST_ONLY_MODEL)
    : models;
  return NextResponse.json({ models: filteredModels });
}
