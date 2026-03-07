import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { MessageList } from "@/modules/chat/components/MessageList";
import { ChatComposer } from "@/modules/chat/components/ChatComposer";
import { MOCK_MESSAGES } from "@/modules/chat/mocks/messages";
import { MOCK_CONVERSATIONS } from "@/modules/conversations/mocks";

// Next.js 16 App Router: params is a Promise
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversation = MOCK_CONVERSATIONS.find((c) => c.id === id);
  const messages = MOCK_MESSAGES.filter((m) => m.conversationId === id);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        title={conversation?.title ?? "Conversation"}
        showBack
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {messages.length > 0 ? (
            <MessageList messages={messages} />
          ) : (
            <div className="flex items-center justify-center h-full py-20">
              <p className="text-text-secondary text-sm">No messages yet.</p>
            </div>
          )}
        </div>
      </main>
      <ChatComposer />
    </div>
  );
}
