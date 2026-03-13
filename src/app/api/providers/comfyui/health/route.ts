import { NextResponse } from "next/server";
import { ComfyUIClient } from "@/modules/providers/lib/comfyui";

export async function GET() {
  const client = new ComfyUIClient(
    process.env.COMFYUI_BASE_URL ?? "http://192.168.1.202:8188"
  );
  const connected = await client.isConnected();
  return NextResponse.json({ connected });
}
