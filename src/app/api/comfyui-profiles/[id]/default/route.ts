import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { setDefaultProfile } from "@/modules/providers/repositories/comfyui-profiles-repository";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const { id } = await params;
  const profile = await setDefaultProfile(session.userId, id);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile });
}
