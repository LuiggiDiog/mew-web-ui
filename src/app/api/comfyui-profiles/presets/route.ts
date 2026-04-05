import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import {
  buildZImageTurboWorkflow,
  buildZImageTurboImg2ImgWorkflow,
  buildPrefectPonyXLWorkflow,
  Z_IMAGE_TURBO_OUTPUT_NODE,
  Z_IMAGE_TURBO_PLACEHOLDERS,
  Z_IMAGE_TURBO_IMG2IMG_PLACEHOLDERS,
  PREFECT_PONY_XL_OUTPUT_NODE,
  PREFECT_PONY_XL_PLACEHOLDERS,
  Z_IMAGE_TURBO_ENHANCE_SYSTEM_PROMPT,
} from "@/modules/providers/services/comfyui";
import { env } from "@/env";

type PresetId = "z-image-turbo" | "prefect-pony-xl";

interface PresetModels {
  unet?: string;
  clip?: string;
  vae?: string;
}

interface PresetResponse {
  name: string;
  workflowJson: object;
  img2imgWorkflowJson: object | null;
  outputNodeId: string;
  placeholders: object;
  img2imgPlaceholders: object | null;
  enhanceSystemPrompt: string | null;
  enhanceImg2ImgSystemPrompt: string | null;
}

function buildPreset(id: PresetId, models?: PresetModels): PresetResponse {
  if (id === "z-image-turbo") {
    const unet = models?.unet ?? env.comfyuiUnetModel;
    const clip = models?.clip ?? env.comfyuiClipModel;
    const vae  = models?.vae  ?? env.comfyuiVaeModel;
    return {
      name: "Z-Image Turbo",
      workflowJson: buildZImageTurboWorkflow(unet, clip, vae),
      img2imgWorkflowJson: buildZImageTurboImg2ImgWorkflow(unet, clip, vae),
      outputNodeId: Z_IMAGE_TURBO_OUTPUT_NODE,
      placeholders: Z_IMAGE_TURBO_PLACEHOLDERS,
      img2imgPlaceholders: Z_IMAGE_TURBO_IMG2IMG_PLACEHOLDERS,
      enhanceSystemPrompt: Z_IMAGE_TURBO_ENHANCE_SYSTEM_PROMPT,
      enhanceImg2ImgSystemPrompt: Z_IMAGE_TURBO_ENHANCE_SYSTEM_PROMPT,
    };
  }

  if (id === "prefect-pony-xl") {
    const checkpoint = models?.unet ?? "prefectPonyXL_v6.safetensors";
    return {
      name: "Prefect Pony XL",
      workflowJson: buildPrefectPonyXLWorkflow(checkpoint),
      img2imgWorkflowJson: null,
      outputNodeId: PREFECT_PONY_XL_OUTPUT_NODE,
      placeholders: PREFECT_PONY_XL_PLACEHOLDERS,
      img2imgPlaceholders: null,
      enhanceSystemPrompt: null,
      enhanceImg2ImgSystemPrompt: null,
    };
  }

  throw new Error(`Unknown preset: ${id}`);
}

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;
  void session;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.preset !== "string") {
    return NextResponse.json({ error: "preset is required" }, { status: 400 });
  }

  const VALID_PRESETS: PresetId[] = ["z-image-turbo", "prefect-pony-xl"];
  if (!VALID_PRESETS.includes(body.preset as PresetId)) {
    return NextResponse.json({ error: `Unknown preset "${body.preset}"` }, { status: 404 });
  }

  const preset = buildPreset(body.preset as PresetId, body.models as PresetModels | undefined);
  return NextResponse.json(preset);
}
