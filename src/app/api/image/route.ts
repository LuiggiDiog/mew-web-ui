import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { ComfyUIClient } from "@/modules/providers/lib/comfyui";
import { isUuid } from "@/modules/shared/utils/uuid";

const MAX_PROMPT_LENGTH = 2_000;
const COMFYUI_MODEL_LABEL = "z-image-turbo";

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
      { status: 400 }
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `prompt exceeds max length (${MAX_PROMPT_LENGTH})` },
      { status: 400 }
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
          eq(conversations.userId, session.userId)
        )
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

  // Generate image via ComfyUI
  const comfyClient = new ComfyUIClient(
    process.env.COMFYUI_BASE_URL ?? "http://192.168.1.202:8188"
  );

  let imageBuffer: Buffer;
  try {
    imageBuffer = await comfyClient.generate(prompt, size === "large" ? "large" : "small");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("timed out")) {
      return NextResponse.json({ error: "Image generation timed out" }, { status: 504 });
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
        eq(conversations.userId, session.userId)
      )
    );

  return NextResponse.json({ imageUrl, conversationId: convId });
}
