import { NextResponse } from "next/server";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { env } from "@/env";

export async function GET() {
  const client = new OllamaClient(env.ollamaBaseUrl);
  const connected = await client.isConnected();
  return NextResponse.json({ connected });
}
