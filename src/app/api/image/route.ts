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

const MAX_PROMPT_LENGTH = 2_000;
const COMFYUI_MODEL_LABEL = "z-image-turbo";

const ENHANCE_SYSTEM_PROMPT = `You are a prompt engineer for Z-Image Turbo, a text-to-image model that excels with natural, cinematic language.
Transform the user's simple description into a single detailed paragraph of 150-200 words optimized for image generation.
Output ONLY the enhanced prompt — no explanations, no lists, no markdown, no quotation marks.
Include: primary subject with specific physical details, precise lighting (e.g. soft diffused daylight, cinematic warm key light, golden hour), environment and background, camera and lens characteristics (e.g. 85mm f/1.4, shallow depth of field, bokeh), textures and materials, mood and atmosphere, composition style.
Keep the user's core intent. Write in flowing descriptive English prose.`;

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

  if (conversationId && !isUuid(conversationId)) {
    return NextResponse.json(
      { error: "conversationId must be a valid UUID" },
      { status: 400 },
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `prompt exceeds max length (${MAX_PROMPT_LENGTH})` },
      { status: 400 },
    );
  }

  // Resolve or create conversation
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
    const title = prompt.slice(0, 60);
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

  // Save user message
  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: prompt,
    type: "text",
  });

  // Optionally enhance the prompt via default text model
  let finalPrompt = prompt;
  const userSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session.userId));
  const settingsMap = Object.fromEntries(
    userSettings.map((s) => [s.key, s.value]),
  );

  if (settingsMap.enhancePrompt === "true") {
    const enhanceModel = settingsMap.defaultModel ?? DEFAULT_MODEL;
    const ollamaClient = new OllamaClient(
      process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    );
    try {
      let enhanced = "";
      for await (const chunk of ollamaClient.chat(
        [
          { role: "system", content: ENHANCE_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        enhanceModel,
      )) {
        enhanced += chunk;
      }
      if (enhanced.trim()) finalPrompt = enhanced.trim();
    } catch {
      // Ollama unreachable or model error — fall back to original prompt
    }
  }

  console.log("Final prompt for ComfyUI:", finalPrompt);

  // Generate image via ComfyUI
  const comfyClient = new ComfyUIClient(
    process.env.COMFYUI_BASE_URL ?? "http://192.168.1.202:8188",
  );

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

  // Save image to public/generated/
  const imageId = crypto.randomUUID();
  const filename = `${imageId}.png`;
  const generatedDir = path.join(process.cwd(), "public", "generated");
  await mkdir(generatedDir, { recursive: true });
  await writeFile(path.join(generatedDir, filename), imageBuffer);
  const imageUrl = `/generated/${filename}`;

  // Save assistant message
  await db.insert(messages).values({
    conversationId: convId,
    role: "assistant",
    content: imageUrl,
    model: COMFYUI_MODEL_LABEL,
    type: "image",
  });

  // Update conversation preview
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
