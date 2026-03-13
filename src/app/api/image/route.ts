import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getApiSession } from "@/modules/auth/services/api-auth";
import {
  createMessage,
  updateMessageContentByIdInConversation,
} from "@/modules/chat/lib/messages-repository";
import {
  createConversation,
  findConversationByIdForUser,
  updateConversationPreviewByIdForUser,
} from "@/modules/conversations/lib/conversations-repository";
import { ComfyUIClient } from "@/modules/providers/lib/comfyui";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { getSettingsMapByUserId } from "@/modules/settings/lib/settings-repository";
import { isUuid } from "@/modules/shared/utils/uuid";
import { DEFAULT_MODEL } from "@/modules/shared/constants";
import { env } from "@/env";

const MAX_PROMPT_LENGTH = 2_000;
const COMFYUI_MODEL_LABEL = "z-image-turbo";

const ENHANCE_SYSTEM_PROMPT = `You are a prompt enhancer for Z-Image Turbo.
Turn the user's input into a single final image-generation prompt in English.

Your priority is: preserve the user's intent first, enrich only where it helps.

Follow these rules strictly:

1. Identify and preserve every immutable element from the user's prompt:
   - main subject and subject count
   - action, pose, expression, and state
   - named characters, brands, IPs, products, or specific objects
   - explicitly requested colors, clothing, props, symbols, setting, era, framing, or angle
   - every piece of text that must appear inside the image
   Never remove, rename, paraphrase, or contradict these.

2. If the request is abstract, conceptual, or solution-oriented instead of a direct scene description,
   silently invent one clear, concrete visual scenario that best expresses the request before enriching it.

3. Add only supportive detail:
   physical traits, materials, textures, lighting, atmosphere, color relationships, background, spatial depth,
   composition, and environmental context.

4. Use camera, lens, and photographic language only when it improves the result.
   For posters, packaging, logos, UI, diagrams, menus, typography, product renders, or graphic design tasks,
   prioritize layout, hierarchy, readability, placement, surface finish, and design structure instead of cinematic jargon.

5. If visible text must appear in the image, reproduce it exactly and wrap each literal text string in double quotes.
   Also describe where the text appears, its size, style, material, and layout.
   Never invent text unless the user's request clearly implies it.

6. If the user asks for a minimal, simple, flat, icon-like, clean, or product-focused image,
   keep the prompt restrained, precise, and uncluttered.
   Do not force cinematic, ornate, or overly dramatic detail.

7. Write in clear, literal, visual English prose.
   Avoid metaphor, poetic language, vague hype, and meta tags such as:
   masterpiece, best quality, 8k, trending on artstation, award-winning, ultra detailed.

8. Do not add extra people, objects, actions, emotions, story beats, or symbolism unless they are clearly implied by the user's request.

9. If the user's prompt is already detailed and well-structured, refine it lightly instead of rewriting it aggressively.

10. Adapt the length to the request:
   - simple/minimal prompts: 60-100 words
   - normal scenes: 100-160 words
   - complex or text-heavy scenes: 140-220 words
   Stay shorter when simplicity is part of the request.

11. You may receive prior conversation messages for context before the current request.
    Use them to understand references like "add X to it", "make it more Y", "now change the background to Z", or "remove the X".
    The conversation history tells you what the user previously requested and what was generated.
    Incorporate relevant context from prior messages into the new prompt, but always treat the latest user message as the primary intent.
    If there is no prior context, treat the current request as standalone.

Output only the final enhanced prompt as one plain paragraph.
No explanations.
No markdown.
No lists.
No quotation marks around the whole output.`;

function normalizeEnhancedPrompt(text: string): string {
  return text
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^(enhanced prompt|prompt)\s*:\s*/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
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

  const { prompt, conversationId, width, height, chatHistory, seed, preview, skipUserMessage, replaceMessageId } = body as {
    prompt?: string;
    conversationId?: string;
    width?: number;
    height?: number;
    chatHistory?: { role: string; content: string }[];
    seed?: number;
    preview?: boolean;
    skipUserMessage?: boolean;
    replaceMessageId?: string;
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
      model: COMFYUI_MODEL_LABEL,
      provider: "comfyui",
    });

    convId = newConv.id;
  }

  if (!skipUserMessage) {
    await createMessage({
      conversationId: convId,
      role: "user",
      content: inputPrompt,
      type: "text",
    });
  }

  let finalPrompt = inputPrompt;

  const settingsMap = await getSettingsMapByUserId(session.userId);

  console.log("settingsMap.enhancePrompt:", settingsMap.enhancePrompt);

  if (settingsMap.enhancePrompt === "true") {
    console.log("Enhancing prompt via Ollama...");

    const enhanceModel = settingsMap.defaultModel ?? DEFAULT_MODEL;
    console.log("Using enhance model:", enhanceModel);

    const ollamaClient = new OllamaClient(env.ollamaBaseUrl);

    try {
      let enhanced = "";

      const historyMessages = (chatHistory ?? [])
        .filter((m) => typeof m.role === "string" && typeof m.content === "string")
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      for await (const chunk of ollamaClient.chat(
        [
          { role: "system", content: ENHANCE_SYSTEM_PROMPT },
          ...historyMessages,
          { role: "user", content: inputPrompt },
        ],
        enhanceModel,
      )) {
        enhanced += chunk;
      }

      const cleanedEnhanced = normalizeEnhancedPrompt(enhanced);

      if (cleanedEnhanced) {
        finalPrompt = cleanedEnhanced;
      }
    } catch (error) {
      console.error("Prompt enhancement failed:", error);
      // Fall back to the original prompt
    }
  }

  console.log("Final prompt for ComfyUI:", finalPrompt);

  const comfyClient = new ComfyUIClient(env.comfyuiBaseUrl);

  const imgWidth = typeof width === "number" && width >= 512 && width <= 2048 ? width : 1024;
  const imgHeight = typeof height === "number" && height >= 512 && height <= 2048 ? height : 1024;

  // Preview mode: generate at ~50% resolution for speed, rounded to nearest 8
  const actualWidth = preview ? Math.max(256, Math.round(imgWidth / 2 / 8) * 8) : imgWidth;
  const actualHeight = preview ? Math.max(256, Math.round(imgHeight / 2 / 8) * 8) : imgHeight;

  const inputSeed = typeof seed === "number" && seed >= 0 ? Math.floor(seed) : undefined;

  let imageBuffer: Buffer;
  let usedSeed: number;

  try {
    ({ buffer: imageBuffer, seed: usedSeed } = await comfyClient.generate(finalPrompt, actualWidth, actualHeight, inputSeed));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes("timed out")) {
      return NextResponse.json(
        { error: "Image generation timed out" },
        { status: 504 },
      );
    }

    return NextResponse.json({ error: "ComfyUI unreachable" }, { status: 503 });
  }

  const imageId = crypto.randomUUID();
  const filename = `${imageId}.png`;
  const generatedDir = path.join(process.cwd(), "public", "generated");

  await mkdir(generatedDir, { recursive: true });
  await writeFile(path.join(generatedDir, filename), imageBuffer);

  // Encode seed + full dimensions into URL so the frontend can offer an upscale action
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
      model: COMFYUI_MODEL_LABEL,
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
