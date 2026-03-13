import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import {
  createConversation,
  findConversationByIdForUser,
  updateConversationPreviewByIdForUser,
} from "@/modules/conversations/lib/conversations-repository";
import {
  createMessage,
  listMessagesByConversationId,
} from "@/modules/chat/lib/messages-repository";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { isUuid } from "@/modules/shared/utils/uuid";
import { env } from "@/env";

const MAX_MESSAGE_LENGTH = 20_000;
const MAX_MODEL_LENGTH = 200;
const MAX_PROVIDER_LENGTH = 100;

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
    const conversation = await findConversationByIdForUser(session.userId, convId);

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    const title = message.slice(0, 60);
    const newConv = await createConversation({
      userId: session.userId,
      title,
      model,
      provider,
    });
    convId = newConv.id;
  }

  // Save user message
  await createMessage({
    conversationId: convId,
    role: "user",
    content: message,
    type: "text",
  });

  // Fetch up to 20 messages as context
  const history = await listMessagesByConversationId(convId, {
    order: "asc",
    limit: 20,
  });

  const context = history.map((m) => ({ role: m.role, content: m.content }));

  const ollamaClient = new OllamaClient(env.ollamaBaseUrl);

  // Build ReadableStream that streams Ollama chunks to the client
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantContent = "";

      try {
        for await (const chunk of ollamaClient.chat(context, model, request.signal)) {
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

      // Persist assistant message and update conversation
      await createMessage({
        conversationId: convId!,
        role: "assistant",
        content: assistantContent,
        model,
        type: "text",
      });

      await updateConversationPreviewByIdForUser(
        session.userId,
        convId!,
        assistantContent.slice(0, 100)
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
