import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import {
  createMessage,
  deleteMessageById,
  listMessagesByConversationId,
  updateMessageContentByIdInConversation,
} from "@/modules/chat/lib/messages-repository";
import {
  findConversationByIdForUser,
  updateConversationPreviewByIdForUser,
} from "@/modules/conversations/lib/conversations-repository";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { isUuid } from "@/modules/shared/utils/uuid";
import { env } from "@/env";

const MAX_MESSAGE_LENGTH = 20_000;
const MAX_MODEL_LENGTH = 200;
const MAX_HISTORY_MESSAGES = 500;
const MAX_CONTEXT_MESSAGES = 20;

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

  const conversation = await findConversationByIdForUser(
    session.userId,
    conversationId
  );

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recentHistory = await listMessagesByConversationId(conversationId, {
    order: "desc",
    limit: MAX_HISTORY_MESSAGES,
  });
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

  await updateMessageContentByIdInConversation(
    targetMessage.id,
    conversationId,
    trimmedContent
  );

  const trailingMessages = history.slice(targetIndex + 1);
  for (const trailing of trailingMessages) {
    await deleteMessageById(trailing.id);
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
        for await (const chunk of ollamaClient.chat(context, editModel, request.signal)) {
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

      await createMessage({
        conversationId,
        role: "assistant",
        content: assistantContent,
        model: editModel,
        type: "text",
      });

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
