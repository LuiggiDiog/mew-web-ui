import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { NewChatArea } from "@/modules/chat/components/NewChatArea";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const welcomeSeed = Date.now();

  return (
    <div className="flex flex-col h-full">
      <ChatHeader />
      <NewChatArea welcomeSeed={welcomeSeed} />
    </div>
  );
}
