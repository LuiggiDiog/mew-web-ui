import { NextResponse } from "next/server";
import { ComfyUIClient } from "@/modules/providers/lib/comfyui";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { env } from "@/env";

export async function GET() {
  const { error } = await getApiSession();
  if (error) return error;

  const client = new ComfyUIClient(env.comfyuiBaseUrl);

  const connected = await client.isConnected();
  if (!connected) {
    return NextResponse.json({ error: "ComfyUI unreachable" }, { status: 503 });
  }

  try {
    const models = await client.listModels();
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ error: "ComfyUI unreachable" }, { status: 503 });
  }
}
