import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import {
  listProfilesByUserId,
  createProfile,
} from "@/modules/providers/repositories/comfyui-profiles-repository";

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  const profiles = await listProfilesByUserId(session.userId);
  return NextResponse.json({ profiles });
}

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, baseUrl, workflowJson, img2imgWorkflowJson, outputNodeId, placeholders, img2imgPlaceholders, enhanceSystemPrompt, enhanceImg2ImgSystemPrompt, enhanceModel, isDefault } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    return NextResponse.json({ error: "baseUrl is required" }, { status: 400 });
  }
  if (!workflowJson || typeof workflowJson !== "object") {
    return NextResponse.json({ error: "workflowJson is required" }, { status: 400 });
  }
  if (!placeholders || typeof placeholders !== "object") {
    return NextResponse.json({ error: "placeholders is required" }, { status: 400 });
  }

  try {
    const profile = await createProfile({
      userId: session.userId,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      workflowJson: workflowJson as object,
      img2imgWorkflowJson: (img2imgWorkflowJson as object | null) ?? null,
      outputNodeId: typeof outputNodeId === "string" ? outputNodeId : "9",
      placeholders: placeholders as object,
      img2imgPlaceholders: (img2imgPlaceholders as object | null) ?? null,
      enhanceSystemPrompt: typeof enhanceSystemPrompt === "string" ? enhanceSystemPrompt : null,
      enhanceImg2ImgSystemPrompt: typeof enhanceImg2ImgSystemPrompt === "string" ? enhanceImg2ImgSystemPrompt : null,
      enhanceModel: typeof enhanceModel === "string" ? enhanceModel : null,
      isDefault: isDefault === true,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "A profile with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
