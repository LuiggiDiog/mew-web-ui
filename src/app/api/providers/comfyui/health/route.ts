import { NextResponse } from "next/server";
import { ComfyUIClient } from "@/modules/providers/lib/comfyui";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { env } from "@/env";

export async function GET() {
  const { error } = await getApiSession();
  if (error) return error;

  const client = new ComfyUIClient(env.comfyuiBaseUrl);
  const connected = await client.isConnected();
  return NextResponse.json({ connected });
}
