import { NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { OllamaClient } from "@/modules/providers/services/ollama";
import { listProvidersByUserId } from "@/modules/providers/repositories/providers-repository";

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  const rows = await listProvidersByUserId(session.userId);

  // Augment each provider with live health check
  const result = await Promise.all(
    rows.map(async (p) => {
      let connected = false;
      if (p.type === "local" && p.baseUrl) {
        const client = new OllamaClient(p.baseUrl);
        connected = await client.isConnected();
      }
      return { ...p, connected };
    })
  );

  return NextResponse.json({ providers: result });
}
