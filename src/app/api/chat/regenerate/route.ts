import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { isUuid } from "@/modules/shared/utils/uuid";

const MAX_MODEL_LENGTH = 200;

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { conversationId, model } = body as {
    conversationId?: string;
    model?: string;
  };

  if (!conversationId || !isUuid(conversationId)) {
    return NextResponse.json(
      { error: "conversationId is required and must be a valid UUID" },
      { status: 400 }
    );
  }

  if (model && (typeof model !== "string" || model.length > MAX_MODEL_LENGTH)) {
    return NextResponse.json(
      { error: "model must be a string within max length" },
      { status: 400 }
    );
  }

  // Verify conversation belongs to user
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.userId)
      )
    );

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find the last message in the conversation
  const [lastMessage] = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  if (!lastMessage || lastMessage.role !== "assistant") {
    return NextResponse.json(
      { error: "Nothing to regenerate" },
      { status: 400 }
    );
  }

  const regenerateModel = model || lastMessage.model || conversation.model;

  // Delete the last assistant message
  await db.delete(messages).where(eq(messages.id, lastMessage.id));

  // Fetch remaining messages as context (up to 20)
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(20);

  const context = history.map((m) => ({ role: m.role, content: m.content }));

  const ollamaClient = new OllamaClient(
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"
  );

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantContent = "";

      try {
        for await (const chunk of ollamaClient.chat(context, regenerateModel)) {
          assistantContent += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (e) {
        controller.error(e);
        return;
      }

      // Persist new assistant message
      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: assistantContent,
        model: regenerateModel,
        type: "text",
      });

      // Update conversation preview
      await db
        .update(conversations)
        .set({
          preview: assistantContent.slice(0, 100),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, session.userId)
          )
        );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": conversationId,
      "Cache-Control": "no-cache",
    },
  });
}
