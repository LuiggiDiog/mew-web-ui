import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { findProfileById } from "@/modules/providers/repositories/comfyui-profiles-repository";
import { ComfyUIClient } from "@/modules/providers/services/comfyui";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const { id } = await params;
  const profile = await findProfileById(session.userId, id);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = new ComfyUIClient(profile.baseUrl);
  const connected = await client.isConnected();

  return NextResponse.json({ connected });
}
