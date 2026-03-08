import { NextResponse } from "next/server";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { OllamaClient } from "@/modules/providers/lib/ollama";

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  const rows = await db
    .select()
    .from(providers)
    .where(eq(providers.userId, session.userId));

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
