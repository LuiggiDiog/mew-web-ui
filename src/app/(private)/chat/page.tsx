import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { EmptyState } from "@/modules/chat/components/EmptyState";
import { ChatComposer } from "@/modules/chat/components/ChatComposer";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full">
      <ChatHeader />
      <main className="flex-1 overflow-y-auto flex items-center justify-center px-4">
        <EmptyState />
      </main>
      <ChatComposer />
    </div>
  );
}
