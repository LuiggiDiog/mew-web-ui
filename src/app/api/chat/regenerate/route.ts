import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import {
  createMessage,
  deleteMessageById,
  findLastMessageByConversationId,
  listMessagesByConversationId,
} from "@/modules/chat/lib/messages-repository";
import {
  findConversationByIdForUser,
  updateConversationPreviewByIdForUser,
} from "@/modules/conversations/lib/conversations-repository";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { isUuid } from "@/modules/shared/utils/uuid";
import { env } from "@/env";

const MAX_MODEL_LENGTH = 200;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

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
  const conversation = await findConversationByIdForUser(
    session.userId,
    conversationId
  );

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find the last message in the conversation
  const lastMessage = await findLastMessageByConversationId(conversationId);

  if (!lastMessage || lastMessage.role !== "assistant") {
    return NextResponse.json(
      { error: "Nothing to regenerate" },
      { status: 400 }
    );
  }

  const regenerateModel = model || lastMessage.model || conversation.model;

  // Delete the last assistant message
  await deleteMessageById(lastMessage.id);

  // Fetch remaining messages as context (up to 20)
  const history = await listMessagesByConversationId(conversationId, {
    order: "asc",
    limit: 20,
  });

  const context = history.map((m) => ({ role: m.role, content: m.content }));

  const ollamaClient = new OllamaClient(env.ollamaBaseUrl);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantContent = "";

      try {
        for await (const chunk of ollamaClient.chat(
          context,
          regenerateModel,
          request.signal
        )) {
          if (request.signal.aborted) {
            controller.close();
            return;
          }
          assistantContent += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (e) {
        if (request.signal.aborted || isAbortError(e)) {
          controller.close();
          return;
        }
        controller.error(e);
        return;
      }

      if (request.signal.aborted) {
        controller.close();
        return;
      }

      // Persist new assistant message
      await createMessage({
        conversationId,
        role: "assistant",
        content: assistantContent,
        model: regenerateModel,
        type: "text",
      });

      // Update conversation preview
      await updateConversationPreviewByIdForUser(
        session.userId,
        conversationId,
        assistantContent.slice(0, 100)
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
