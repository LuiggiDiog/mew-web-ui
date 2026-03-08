import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { isUuid } from "@/modules/shared/utils/uuid";

const MAX_MESSAGE_LENGTH = 20_000;
const MAX_MODEL_LENGTH = 200;
const MAX_PROVIDER_LENGTH = 100;

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, model, provider, conversationId } = body as {
    message?: string;
    model?: string;
    provider?: string;
    conversationId?: string;
  };

  if (
    typeof message !== "string" ||
    typeof model !== "string" ||
    typeof provider !== "string" ||
    !message ||
    !model ||
    !provider
  ) {
    return NextResponse.json(
      { error: "message, model, and provider are required" },
      { status: 400 }
    );
  }

  if (conversationId && !isUuid(conversationId)) {
    return NextResponse.json(
      { error: "conversationId must be a valid UUID" },
      { status: 400 }
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `message exceeds max length (${MAX_MESSAGE_LENGTH})` },
      { status: 400 }
    );
  }

  if (model.length > MAX_MODEL_LENGTH || provider.length > MAX_PROVIDER_LENGTH) {
    return NextResponse.json(
      { error: "model/provider exceed max length" },
      { status: 400 }
    );
  }

  // Resolve or create conversation, always scoped to the authenticated user
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
    const title = message.slice(0, 60);
    const [newConv] = await db
      .insert(conversations)
      .values({ userId: session.userId, title, model, provider })
      .returning();
    convId = newConv.id;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: message,
  });

  // Fetch up to 20 messages as context
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .limit(20);

  const context = history.map((m) => ({ role: m.role, content: m.content }));

  const ollamaClient = new OllamaClient(
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"
  );

  // Build ReadableStream that streams Ollama chunks to the client
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantContent = "";

      try {
        for await (const chunk of ollamaClient.chat(context, model)) {
          assistantContent += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (e) {
        controller.error(e);
        return;
      }

      // Persist assistant message and update conversation
      await db.insert(messages).values({
        conversationId: convId!,
        role: "assistant",
        content: assistantContent,
        model,
      });

      await db
        .update(conversations)
        .set({
          preview: assistantContent.slice(0, 100),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, convId!),
            eq(conversations.userId, session.userId)
          )
        );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": convId,
      "Cache-Control": "no-cache",
    },
  });
}
