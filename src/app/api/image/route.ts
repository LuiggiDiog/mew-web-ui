import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { conversations, messages, settings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { ComfyUIClient } from "@/modules/providers/lib/comfyui";
import { OllamaClient } from "@/modules/providers/lib/ollama";
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

  const { prompt, conversationId, size } = body as {
    prompt?: string;
    conversationId?: string;
    size?: string;
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
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, convId),
          eq(conversations.userId, session.userId),
        ),
      );

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    const title = inputPrompt.slice(0, 60);

    const [newConv] = await db
      .insert(conversations)
      .values({
        userId: session.userId,
        title,
        model: COMFYUI_MODEL_LABEL,
        provider: "comfyui",
      })
      .returning();

    convId = newConv.id;
  }

  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: inputPrompt,
    type: "text",
  });

  let finalPrompt = inputPrompt;

  const userSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session.userId));

  const settingsMap = Object.fromEntries(
    userSettings.map((s) => [s.key, s.value]),
  );

  console.log("settingsMap.enhancePrompt:", settingsMap.enhancePrompt);

  if (settingsMap.enhancePrompt === "true") {
    console.log("Enhancing prompt via Ollama...");

    const enhanceModel = settingsMap.defaultModel ?? DEFAULT_MODEL;
    console.log("Using enhance model:", enhanceModel);

    const ollamaClient = new OllamaClient(env.ollamaBaseUrl);

    try {
      let enhanced = "";

      for await (const chunk of ollamaClient.chat(
        [
          { role: "system", content: ENHANCE_SYSTEM_PROMPT },
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

  let imageBuffer: Buffer;

  try {
    imageBuffer = await comfyClient.generate(
      finalPrompt,
      size === "large" ? "large" : "small",
    );
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

  const imageUrl = `/generated/${filename}`;

  await db.insert(messages).values({
    conversationId: convId,
    role: "assistant",
    content: imageUrl,
    model: COMFYUI_MODEL_LABEL,
    type: "image",
  });

  await db
    .update(conversations)
    .set({ preview: "[Image generated]", updatedAt: new Date() })
    .where(
      and(
        eq(conversations.id, convId),
        eq(conversations.userId, session.userId),
      ),
    );

  return NextResponse.json({ imageUrl, conversationId: convId });
}
