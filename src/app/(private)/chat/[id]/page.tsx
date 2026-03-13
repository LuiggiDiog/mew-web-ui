import { notFound } from "next/navigation";
import { getSession } from "@/modules/auth/lib/session";
import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { ChatArea } from "@/modules/chat/components/ChatArea";
import type { Message } from "@/modules/chat/types";
import { isUuid } from "@/modules/shared/utils/uuid";
import { listMessagesByConversationId } from "@/modules/chat/lib/messages-repository";
import { findConversationByIdForUser } from "@/modules/conversations/lib/conversations-repository";

// Next.js 16 App Router: params is a Promise
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session.userId || !isUuid(id)) notFound();

  const conversation = await findConversationByIdForUser(session.userId, id);

  if (!conversation) notFound();

  const msgs = await listMessagesByConversationId(id, { order: "asc" });

  const initialMessages: Message[] = msgs.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    model: m.model ?? undefined,
    type: (m.type as "text" | "image") ?? undefined,
  }));

  return (
    <div className="flex flex-col h-full">
      <ChatHeader title={conversation.title} showBack />
      <ChatArea conversationId={id} initialMessages={initialMessages} />
    </div>
  );
}
