import { notFound } from "next/navigation";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/modules/auth/lib/session";
import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { ChatArea } from "@/modules/chat/components/ChatArea";
import type { Message } from "@/modules/chat/types";
import { isUuid } from "@/modules/shared/utils/uuid";

// Next.js 16 App Router: params is a Promise
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session.userId || !isUuid(id)) notFound();

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.userId)));

  if (!conversation) notFound();

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const initialMessages: Message[] = msgs.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    model: m.model ?? undefined,
  }));

  return (
    <div className="flex flex-col h-full">
      <ChatHeader title={conversation.title} showBack />
      <ChatArea conversationId={id} initialMessages={initialMessages} />
    </div>
  );
}
