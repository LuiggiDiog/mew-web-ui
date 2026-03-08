import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { NewChatArea } from "@/modules/chat/components/NewChatArea";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full">
      <ChatHeader />
      <NewChatArea />
    </div>
  );
}
