"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/modules/chat/components/EmptyState";
import { MessageList } from "@/modules/chat/components/MessageList";
import { ChatComposer } from "@/modules/chat/components/ChatComposer";
import { useChatStore } from "@/modules/chat/store/chatStore";
import type { Message } from "@/modules/chat/types";

interface NewChatAreaProps {
  welcomeSeed?: number;
}

export function NewChatArea({ welcomeSeed = 0 }: NewChatAreaProps) {
  const router = useRouter();
  const { activeModel, activeProvider, setStreamingMessageId } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);

  const handleSend = useCallback(
    async (text: string) => {
      if (streaming) return;

      const tempConvId = "new";
      const userMsg: Message = {
        id: `optimistic-user-${Date.now()}`,
        conversationId: tempConvId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      const assistantId = `optimistic-assistant-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        conversationId: tempConvId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        model: activeModel,
      };

      setMessages([userMsg, assistantMsg]);
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

        const newConvId = res.headers.get("X-Conversation-Id");
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

        if (newConvId) {
          router.push(`/chat/${newConvId}`);
        }
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
    [activeModel, activeProvider, streaming, router, setStreamingMessageId]
  );

  return (
    <>
      <main className="flex-1 overflow-y-auto flex items-center justify-center px-4">
        {messages.length === 0 ? (
          <EmptyState welcomeSeed={welcomeSeed} />
        ) : (
          <div className="w-full max-w-2xl py-4">
            <MessageList messages={messages} />
          </div>
        )}
      </main>
      <ChatComposer onSend={handleSend} disabled={streaming} />
    </>
  );
}
