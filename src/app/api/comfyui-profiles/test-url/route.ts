import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { ComfyUIClient } from "@/modules/providers/services/comfyui";

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;
  void session;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const client = new ComfyUIClient(body.url.trim().replace(/\/+$/, ""));
  const connected = await client.isConnected();

  return NextResponse.json({ connected });
}
