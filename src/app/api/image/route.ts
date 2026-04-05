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
import {
  ComfyUIClient,
  TRANSLATE_TO_CHINESE_SYSTEM_PROMPT,
  CONTEXT_MERGE_SYSTEM_PROMPT,
} from "@/modules/providers/services/comfyui";
import { getEnhancePlugins, resolveEnhancePlugin } from "@/modules/plugins/services/plugin-loader";
import { normalizeEnhancedPrompt } from "@/modules/shared/utils";
import { OllamaClient } from "@/modules/providers/services/ollama";
import { getSettingsMapByUserId } from "@/modules/settings/repositories/settings-repository";
import {
  findProfileById,
  findDefaultProfile,
  type PlaceholderMap,
} from "@/modules/providers/repositories/comfyui-profiles-repository";
import { getDraftImageDimensions, isUuid } from "@/modules/shared/utils";
import { createLogger } from "@/modules/shared/services";
import { DEFAULT_MODEL } from "@/modules/shared/constants";
import { env } from "@/env";

const MAX_PROMPT_LENGTH = 2_000;
const logger = createLogger("api:image");

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
  logger.info("Image generation started", {
    hasConversationId: !!conversationId,
    preview: !!preview,
    hasReferenceImage: !!referenceImage,
    profileId: profile.id,
  });
  logger.debug("User prompt", inputPrompt);

  const settingsMap = await getSettingsMapByUserId(session.userId);
  const contextAwareEnabled = settingsMap.contextAwarePrompts !== "false";
  logger.debug("Image settings", {
    contextAware: settingsMap.contextAwarePrompts,
    enhance: settingsMap.enhancePrompt,
    translate: settingsMap.translatePromptToChinese,
    model: settingsMap.defaultModel,
  });

  const historyForContext = (chatHistory ?? [])
    .filter((m) => typeof m.role === "string" && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const shouldUseContextAwareJoin = contextAwareEnabled;

  if (shouldUseContextAwareJoin && historyForContext.length > 0 && settingsMap.enhancePrompt !== "true") {
    // When enhance is OFF: use LLM-based semantic merge so iterative modifications
    // (e.g., "change hair to brown") properly replace attributes instead of appending them.
    const previousUserPrompts = historyForContext
      .filter((m) => m.role === "user")
      .map((m) => m.content);
    if (previousUserPrompts.length > 0) {
      try {
        const mergeOllamaClient = new OllamaClient(env.ollamaBaseUrl);
        const mergeModel = settingsMap.defaultModel ?? DEFAULT_MODEL;
        let merged = "";
        for await (const chunk of mergeOllamaClient.chat(
          [
            { role: "system", content: CONTEXT_MERGE_SYSTEM_PROMPT },
            ...previousUserPrompts.map((p) => ({ role: "user" as const, content: p })),
            { role: "user", content: inputPrompt },
          ],
          mergeModel,
        )) {
          merged += chunk;
        }
        const cleanedMerged = normalizeEnhancedPrompt(merged);
        if (cleanedMerged) finalPrompt = cleanedMerged;
      } catch (mergeError) {
        logger.warn("Context merge failed, falling back to latest prompt", mergeError);
      }
      logger.debug("Context-resolved prompt", finalPrompt);
    }
  } else if (shouldUseContextAwareJoin && historyForContext.length > 0 && settingsMap.enhancePrompt === "true") {
    // When enhance is ON: skip the extra merge LLM call — the enhance LLM already
    // receives historyMessages and handles iterative context.
    logger.debug("Context-resolved prompt (enhance path, history passed to enhance plugin)");
  }

  if (settingsMap.enhancePrompt === "true") {
    const enhancePlugins = await getEnhancePlugins();
    const plugin = resolveEnhancePlugin(enhancePlugins, profile);

    if (plugin) {
      const enhanceModel = profile.enhanceModel ?? settingsMap.defaultModel ?? DEFAULT_MODEL;
      const historyMessages = contextAwareEnabled
        ? (chatHistory ?? [])
          .filter((m) => typeof m.role === "string" && typeof m.content === "string" && m.role === "user")
          .slice(-10)
          .map((m) => ({ role: "user" as const, content: m.content }))
        : [];

      logger.debug("Enhance plugin selected", {
        pluginId: plugin.id,
        pluginName: plugin.name,
        historyMessagesCount: historyMessages.length,
      });

      try {
        const result = await plugin.enhance({
          ollamaClient: new OllamaClient(env.ollamaBaseUrl),
          model: enhanceModel,
          userPrompt: inputPrompt,
          historyMessages,
          isImg2Img: !!referenceImage,
          customSystemPrompt: profile.enhanceSystemPrompt ?? undefined,
          customImg2ImgSystemPrompt: profile.enhanceImg2ImgSystemPrompt ?? undefined,
        });
        if (result.prompt) finalPrompt = result.prompt;
      } catch (enhanceError) {
        logger.warn("Prompt enhancement failed", enhanceError);
      }
    }
  }

  logger.debug("Enhanced prompt", finalPrompt);

  if (settingsMap.translatePromptToChinese === "true") {
    const translateModel = settingsMap.defaultModel ?? DEFAULT_MODEL;
    const ollamaClient = new OllamaClient(env.ollamaBaseUrl);

    const historyForTranslation = (chatHistory ?? [])
      .filter((m) => typeof m.role === "string" && typeof m.content === "string")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      let translated = "";
      for await (const chunk of ollamaClient.chat(
        [
          { role: "system", content: TRANSLATE_TO_CHINESE_SYSTEM_PROMPT },
          ...historyForTranslation,
          { role: "user", content: finalPrompt },
        ],
        translateModel,
      )) {
        translated += chunk;
      }
      const cleanedTranslated = normalizeEnhancedPrompt(translated);
      if (cleanedTranslated) finalPrompt = cleanedTranslated;
    } catch (translateError) {
      logger.warn("Prompt translation failed", translateError);
    }
    logger.debug("Translated prompt", finalPrompt);
  }

  const comfyClient = new ComfyUIClient(profile.baseUrl);

  const imgWidth = typeof width === "number" && width >= 512 && width <= 2048 ? width : 1024;
  const imgHeight = typeof height === "number" && height >= 512 && height <= 2048 ? height : 1024;

  const draftDimensions = preview ? getDraftImageDimensions(imgWidth, imgHeight) : null;
  const actualWidth = draftDimensions?.width ?? imgWidth;
  const actualHeight = draftDimensions?.height ?? imgHeight;

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
    logger.error("ComfyUI generation error", msg);

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

  logger.info("Image generation completed", {
    conversationId: convId,
    preview: !!preview,
    seed: usedSeed,
    width: imgWidth,
    height: imgHeight,
  });

  return NextResponse.json({ imageUrl, conversationId: convId, seed: usedSeed, fullWidth: imgWidth, fullHeight: imgHeight });
}
