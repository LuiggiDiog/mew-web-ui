import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import {
  findProfileById,
  updateProfile,
  deleteProfile,
} from "@/modules/providers/repositories/comfyui-profiles-repository";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const { id } = await params;
  const profile = await findProfileById(session.userId, id);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowed = [
    "name", "baseUrl", "workflowJson", "img2imgWorkflowJson",
    "outputNodeId", "placeholders", "img2imgPlaceholders",
    "enhanceSystemPrompt", "enhanceImg2ImgSystemPrompt", "enhanceModel", "isDefault",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = (body as Record<string, unknown>)[key];
  }

  try {
    const profile = await updateProfile(session.userId, id, data);
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "A profile with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const { id } = await params;
  const result = await deleteProfile(session.userId, id);

  if (!result.deleted) {
    return NextResponse.json({ error: result.reason ?? "Cannot delete" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
