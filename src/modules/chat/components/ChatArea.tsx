"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageList } from "@/modules/chat/components/MessageList";
import { ChatComposer } from "@/modules/chat/components/ChatComposer";
import { useChatStore } from "@/modules/chat/store/chatStore";
import type { Message } from "@/modules/chat/types";

interface ChatAreaProps {
  conversationId: string;
  initialMessages: Message[];
}

export function ChatArea({ conversationId, initialMessages }: ChatAreaProps) {
  const router = useRouter();
  const { activeModel, activeProvider, setStreamingMessageId } = useChatStore();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);

  const handleSend = useCallback(
    async (text: string) => {
      if (streaming) return;

      const userMsg: Message = {
        id: `optimistic-user-${Date.now()}`,
        conversationId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };

      const assistantId = `optimistic-assistant-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        conversationId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        model: activeModel,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);
      setStreamingMessageId(assistantId);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            model: activeModel,
            provider: activeProvider,
            conversationId,
          }),
        });

        if (!res.ok || !res.body) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: "Error: could not get response." } : m
            )
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }

        router.refresh();
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "Error: request failed." } : m
          )
        );
      } finally {
        setStreaming(false);
        setStreamingMessageId(null);
      }
    },
    [conversationId, activeModel, activeProvider, streaming, router, setStreamingMessageId]
  );

  return (
    <>
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
      <ChatComposer onSend={handleSend} disabled={streaming} />
    </>
  );
}
