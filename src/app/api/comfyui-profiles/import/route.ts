import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { createProfile } from "@/modules/providers/repositories/comfyui-profiles-repository";

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, baseUrl, workflowJson, placeholders } = body as Record<string, unknown>;

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

  const b = body as Record<string, unknown>;

  try {
    const profile = await createProfile({
      userId: session.userId,
      name: name.trim(),
      baseUrl: (baseUrl as string).trim(),
      workflowJson: workflowJson as object,
      img2imgWorkflowJson: (b.img2imgWorkflowJson as object | null) ?? null,
      outputNodeId: typeof b.outputNodeId === "string" ? b.outputNodeId : "9",
      placeholders: placeholders as object,
      img2imgPlaceholders: (b.img2imgPlaceholders as object | null) ?? null,
      enhanceSystemPrompt: typeof b.enhanceSystemPrompt === "string" ? b.enhanceSystemPrompt : null,
      enhanceImg2ImgSystemPrompt: typeof b.enhanceImg2ImgSystemPrompt === "string" ? b.enhanceImg2ImgSystemPrompt : null,
      enhanceModel: typeof b.enhanceModel === "string" ? b.enhanceModel : null,
      isDefault: false,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "A profile with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to import profile" }, { status: 500 });
  }
}
