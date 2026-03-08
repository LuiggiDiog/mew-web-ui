"use client";

import { useEffect, useRef, useMemo } from "react";
import { MessageBubble } from "@/modules/chat/components/MessageBubble";
import type { Message } from "@/modules/chat/types";

interface MessageListProps {
  messages: Message[];
  onRegenerate?: () => void;
  streaming?: boolean;
}

export function MessageList({ messages, onRegenerate, streaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef<number>(messages.length);

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 py-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          showActions={message.id === lastAssistantId}
          onRegenerate={onRegenerate}
          actionsDisabled={streaming}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
