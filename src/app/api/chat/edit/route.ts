import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { isUuid } from "@/modules/shared/utils/uuid";
import { env } from "@/env";

const MAX_MESSAGE_LENGTH = 20_000;
const MAX_MODEL_LENGTH = 200;
const MAX_HISTORY_MESSAGES = 500;
const MAX_CONTEXT_MESSAGES = 20;

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { conversationId, messageId, content, model } = body as {
    conversationId?: string;
    messageId?: string;
    content?: string;
    model?: string;
  };

  if (!conversationId || !isUuid(conversationId)) {
    return NextResponse.json(
      { error: "conversationId is required and must be a valid UUID" },
      { status: 400 }
    );
  }

  if (!messageId || !isUuid(messageId)) {
    return NextResponse.json(
      { error: "messageId is required and must be a valid UUID" },
      { status: 400 }
    );
  }

  if (typeof content !== "string") {
    return NextResponse.json(
      { error: "content is required and must be a string" },
      { status: 400 }
    );
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return NextResponse.json(
      { error: "content is required and must be non-empty" },
      { status: 400 }
    );
  }

  if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `content exceeds max length (${MAX_MESSAGE_LENGTH})` },
      { status: 400 }
    );
  }

  if (model && (typeof model !== "string" || model.length > MAX_MODEL_LENGTH)) {
    return NextResponse.json(
      { error: "model must be a string within max length" },
      { status: 400 }
    );
  }

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

  const recentHistory = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);
  const history = [...recentHistory].reverse();

  const targetIndex = history.findIndex((m) => m.id === messageId);
  if (targetIndex === -1) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const targetMessage = history[targetIndex];
  if (targetMessage.role !== "user") {
    return NextResponse.json(
      { error: "Only user messages can be edited" },
      { status: 400 }
    );
  }

  const editModel = model || conversation.model;

  await db
    .update(messages)
    .set({ content: trimmedContent })
    .where(
      and(
        eq(messages.id, targetMessage.id),
        eq(messages.conversationId, conversationId)
      )
    );

  const trailingMessages = history.slice(targetIndex + 1);
  for (const trailing of trailingMessages) {
    await db.delete(messages).where(eq(messages.id, trailing.id));
  }

  const editedHistory = history.slice(0, targetIndex + 1).map((m, index) =>
    index === targetIndex ? { ...m, content: trimmedContent } : m
  );

  const context = editedHistory
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));

  const ollamaClient = new OllamaClient(env.ollamaBaseUrl);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantContent = "";

      try {
        for await (const chunk of ollamaClient.chat(context, editModel)) {
          assistantContent += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (e) {
        controller.error(e);
        return;
      }

      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: assistantContent,
        model: editModel,
        type: "text",
      });

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
