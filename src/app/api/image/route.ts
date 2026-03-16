import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getApiSession } from "@/modules/auth/services/api-auth";
import {
  createMessage,
  updateMessageContentByIdInConversation,
} from "@/modules/chat/repositories/messages-repository";
import {
  createConversation,
  findConversationByIdForUser,
  updateConversationPreviewByIdForUser,
} from "@/modules/conversations/repositories/conversations-repository";
import { ComfyUIClient, ENHANCE_SYSTEM_PROMPT, ENHANCE_IMG2IMG_SYSTEM_PROMPT } from "@/modules/providers/services/comfyui";
import { OllamaClient } from "@/modules/providers/services/ollama";
import { getSettingsMapByUserId } from "@/modules/settings/repositories/settings-repository";
import {
  findProfileById,
  findDefaultProfile,
  type PlaceholderMap,
} from "@/modules/providers/repositories/comfyui-profiles-repository";
import { isUuid } from "@/modules/shared/utils/uuid";
import { DEFAULT_MODEL } from "@/modules/shared/constants";
import { env } from "@/env";

const MAX_PROMPT_LENGTH = 2_000;

function normalizeEnhancedPrompt(text: string): string {
  return text
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^(enhanced prompt|prompt)\s*:\s*/i, "")
    .replace(/^["'""]+|["'""]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    prompt,
    conversationId,
    width,
    height,
    chatHistory,
    seed,
    preview,
    skipUserMessage,
    replaceMessageId,
    referenceImage,
    denoise,
    profileId,
  } = body as {
    prompt?: string;
    conversationId?: string;
    width?: number;
    height?: number;
    chatHistory?: { role: string; content: string }[];
    seed?: number;
    preview?: boolean;
    skipUserMessage?: boolean;
    replaceMessageId?: string;
    referenceImage?: string;
    denoise?: number;
    profileId?: string;
  };

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const inputPrompt = prompt.trim();

  if (conversationId && !isUuid(conversationId)) {
    return NextResponse.json(
      { error: "conversationId must be a valid UUID" },
      { status: 400 },
    );
  }

  if (inputPrompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `prompt exceeds max length (${MAX_PROMPT_LENGTH})` },
      { status: 400 },
    );
  }

  if (referenceImage !== undefined) {
    if (typeof referenceImage !== "string" || !referenceImage.startsWith("data:image/")) {
      return NextResponse.json({ error: "referenceImage must be a valid image data URL" }, { status: 400 });
    }
    const base64Part = referenceImage.split(",")[1] ?? "";
    const estimatedBytes = Math.ceil((base64Part.length * 3) / 4);
    if (estimatedBytes > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "referenceImage exceeds 10MB limit" }, { status: 400 });
    }
  }

  // Load the image profile
  const profile = profileId && isUuid(profileId)
    ? await findProfileById(session.userId, profileId)
    : await findDefaultProfile(session.userId);

  if (!profile) {
    return NextResponse.json(
      { error: "No ComfyUI profile configured. Please add one in Settings." },
      { status: 422 },
    );
  }

  let convId = conversationId;

  if (convId) {
    const conversation = await findConversationByIdForUser(session.userId, convId);

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    const title = inputPrompt.slice(0, 60);
    const newConv = await createConversation({
      userId: session.userId,
      title,
      model: profile.name,
      provider: "comfyui",
    });

    convId = newConv.id;
  }

  if (!skipUserMessage) {
    let userContent = inputPrompt;

    // Save reference image to disk and embed URL in user message
    if (referenceImage) {
      const base64Data = referenceImage.split(",")[1];
      const refBuffer = Buffer.from(base64Data, "base64");
      const refId = crypto.randomUUID();
      const refFilename = `ref_${refId}.png`;
      const generatedDir = path.join(process.cwd(), "public", "generated");
      await mkdir(generatedDir, { recursive: true });
      await writeFile(path.join(generatedDir, refFilename), refBuffer);
      userContent = `[[ref:/generated/${refFilename}]]${inputPrompt}`;
    }

    await createMessage({
      conversationId: convId,
      role: "user",
      content: userContent,
      type: "text",
    });
  }

  let finalPrompt = inputPrompt;

  const settingsMap = await getSettingsMapByUserId(session.userId);

  if (settingsMap.enhancePrompt === "true") {
    const enhanceModel = profile.enhanceModel ?? settingsMap.defaultModel ?? DEFAULT_MODEL;
    const ollamaClient = new OllamaClient(env.ollamaBaseUrl);

    // Use profile's custom system prompts if set, fall back to built-in defaults
    const systemPrompt = referenceImage
      ? (profile.enhanceImg2ImgSystemPrompt ?? ENHANCE_IMG2IMG_SYSTEM_PROMPT)
      : (profile.enhanceSystemPrompt ?? ENHANCE_SYSTEM_PROMPT);

    try {
      let enhanced = "";

      const historyMessages = (chatHistory ?? [])
        .filter((m) => typeof m.role === "string" && typeof m.content === "string")
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      for await (const chunk of ollamaClient.chat(
        [
          { role: "system", content: systemPrompt },
          ...historyMessages,
          { role: "user", content: inputPrompt },
        ],
        enhanceModel,
      )) {
        enhanced += chunk;
      }

      const cleanedEnhanced = normalizeEnhancedPrompt(enhanced);
      if (cleanedEnhanced) finalPrompt = cleanedEnhanced;
    } catch (enhanceError) {
      console.error("Prompt enhancement failed:", enhanceError);
      // Fall back to original prompt
    }
  }

  const comfyClient = new ComfyUIClient(profile.baseUrl);

  const imgWidth = typeof width === "number" && width >= 512 && width <= 2048 ? width : 1024;
  const imgHeight = typeof height === "number" && height >= 512 && height <= 2048 ? height : 1024;

  const actualWidth = preview ? Math.max(256, Math.round(imgWidth / 2 / 8) * 8) : imgWidth;
  const actualHeight = preview ? Math.max(256, Math.round(imgHeight / 2 / 8) * 8) : imgHeight;

  const inputSeed = typeof seed === "number" && seed >= 0 ? Math.floor(seed) : undefined;

  let imageBuffer: Buffer;
  let usedSeed: number;

  try {
    const isImg2Img = !!referenceImage && !!profile.img2imgWorkflowJson;
    const workflowJson = isImg2Img
      ? (profile.img2imgWorkflowJson as object)
      : (profile.workflowJson as object);
    const placeholders = isImg2Img
      ? ((profile.img2imgPlaceholders ?? profile.placeholders) as PlaceholderMap)
      : (profile.placeholders as PlaceholderMap);

    if (isImg2Img && referenceImage) {
      // Upload reference image to ComfyUI first
      const base64Data = referenceImage.split(",")[1];
      const refBuffer = Buffer.from(base64Data, "base64");
      const uploadFilename = `img2img_${crypto.randomUUID()}.png`;
      const uploadedName = await comfyClient.uploadImage(refBuffer, uploadFilename);

      const validDenoise = typeof denoise === "number" ? Math.max(0.1, Math.min(1.0, denoise)) : 0.65;

      ({ buffer: imageBuffer, seed: usedSeed } = await comfyClient.generate({
        workflowJson,
        placeholders,
        outputNodeId: profile.outputNodeId,
        values: {
          prompt: finalPrompt,
          width: actualWidth,
          height: actualHeight,
          seed: inputSeed,
          denoise: validDenoise,
          referenceImage: uploadedName,
        },
      }));
    } else {
      ({ buffer: imageBuffer, seed: usedSeed } = await comfyClient.generate({
        workflowJson,
        placeholders,
        outputNodeId: profile.outputNodeId,
        values: {
          prompt: finalPrompt,
          width: actualWidth,
          height: actualHeight,
          seed: inputSeed,
        },
      }));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ComfyUI generation error:", msg);

    if (msg.includes("timed out")) {
      return NextResponse.json(
        { error: "Image generation timed out" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: msg.includes("fetch") || msg.includes("ECONNREFUSED") ? "ComfyUI unreachable" : `ComfyUI error: ${msg}` },
      { status: 503 },
    );
  }

  const imageId = crypto.randomUUID();
  const filename = `${imageId}.png`;
  const generatedDir = path.join(process.cwd(), "public", "generated");

  await mkdir(generatedDir, { recursive: true });
  await writeFile(path.join(generatedDir, filename), imageBuffer);

  const imageUrl = preview
    ? `/generated/${filename}?s=${usedSeed}&fw=${imgWidth}&fh=${imgHeight}`
    : `/generated/${filename}`;

  if (replaceMessageId && isUuid(replaceMessageId)) {
    await updateMessageContentByIdInConversation(replaceMessageId, convId!, imageUrl);
  } else {
    await createMessage({
      conversationId: convId,
      role: "assistant",
      content: imageUrl,
      model: profile.name,
      type: "image",
    });
  }

  await updateConversationPreviewByIdForUser(
    session.userId,
    convId,
    "[Image generated]"
  );

  return NextResponse.json({ imageUrl, conversationId: convId, seed: usedSeed, fullWidth: imgWidth, fullHeight: imgHeight });
}
