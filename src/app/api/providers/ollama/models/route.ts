import { NextResponse } from "next/server";
import { OllamaClient } from "@/modules/providers/lib/ollama";

const TEST_ONLY_MODEL =
  "hf.co/mradermacher/Dolphin-Mistral-24B-Venice-Edition-GGUF:Q4_K_M";

function isTrue(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

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
  const testOnlyMode = isTrue(process.env.OLLAMA_TEST_ONLY_MODEL_ENABLED);
  const filteredModels = testOnlyMode
    ? models.filter((model) => model.name === TEST_ONLY_MODEL)
    : models;
  return NextResponse.json({ models: filteredModels });
}
