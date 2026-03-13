import { NextResponse } from "next/server";
import { ComfyUIClient } from "@/modules/providers/lib/comfyui";
import { getApiSession } from "@/modules/auth/lib/api-auth";

export async function GET() {
  const { error } = await getApiSession();
  if (error) return error;

  const client = new ComfyUIClient(
    process.env.COMFYUI_BASE_URL ?? "http://192.168.1.202:8188"
  );
  const connected = await client.isConnected();
  return NextResponse.json({ connected });
}
