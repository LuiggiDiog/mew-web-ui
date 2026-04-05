import { db } from "@/db";
import { messages } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";

export type MessageRecord = typeof messages.$inferSelect;

type ListMessagesOptions = {
  order?: "asc" | "desc";
  limit?: number;
};

type CreateMessageInput = {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  type?: string;
};

export async function createMessage(input: CreateMessageInput): Promise<void> {
  await db.insert(messages).values({
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    model: input.model,
    type: input.type ?? "text",
  });
}

export async function listMessagesByConversationId(
  conversationId: string,
  options: ListMessagesOptions = {}
): Promise<MessageRecord[]> {
  const order = options.order ?? "asc";

  if (typeof options.limit === "number") {
    if (order === "desc") {
      return db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(options.limit);
    }

    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(options.limit);
  }

  if (order === "desc") {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt));
  }

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function findLastMessageByConversationId(
  conversationId: string
): Promise<MessageRecord | null> {
  const [message] = await listMessagesByConversationId(conversationId, {
    order: "desc",
    limit: 1,
  });

  return message ?? null;
}

export async function updateMessageContentByIdInConversation(
  messageId: string,
  conversationId: string,
  content: string
): Promise<void> {
  await db
    .update(messages)
    .set({ content })
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.conversationId, conversationId)
      )
    );
}

export async function deleteMessageById(messageId: string): Promise<void> {
  await db.delete(messages).where(eq(messages.id, messageId));
}
