import { db } from "@/db";
import { conversations } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type ConversationRecord = typeof conversations.$inferSelect;

type CreateConversationInput = {
  userId: string;
  title: string;
  model: string;
  provider: string;
};

export async function listConversationsByUserId(
  userId: string
): Promise<ConversationRecord[]> {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function findConversationByIdForUser(
  userId: string,
  conversationId: string
): Promise<ConversationRecord | null> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    );

  return conversation ?? null;
}

export async function createConversation(
  input: CreateConversationInput
): Promise<ConversationRecord> {
  const [conversation] = await db.insert(conversations).values(input).returning();

  if (!conversation) {
    throw new Error("Failed to create conversation");
  }

  return conversation;
}

export async function deleteConversationByIdForUser(
  userId: string,
  conversationId: string
): Promise<ConversationRecord | null> {
  const [deleted] = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .returning();

  return deleted ?? null;
}

export async function updateConversationTitleByIdForUser(
  userId: string,
  conversationId: string,
  title: string
): Promise<ConversationRecord | null> {
  const [updated] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .returning();

  return updated ?? null;
}

export async function updateConversationPreviewByIdForUser(
  userId: string,
  conversationId: string,
  preview: string
): Promise<void> {
  await db
    .update(conversations)
    .set({
      preview,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    );
}
