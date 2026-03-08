import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { OllamaClient } from "@/modules/providers/lib/ollama";

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json();
  const { message, model, provider, conversationId } = body as {
    message?: string;
    model?: string;
    provider?: string;
    conversationId?: string;
  };

  if (!message || !model || !provider) {
    return NextResponse.json(
      { error: "message, model, and provider are required" },
      { status: 400 }
    );
  }

  // Resolve or create conversation
  let convId = conversationId;
  if (!convId) {
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

  // Fetch last 20 messages as context
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
        .where(eq(conversations.id, convId!));

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
