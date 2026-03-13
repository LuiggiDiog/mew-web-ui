"use client";

import { useEffect, useRef, useMemo } from "react";
import { MessageBubble } from "@/modules/chat/components/MessageBubble";
import type { Message } from "@/modules/chat/types";

interface MessageListProps {
  messages: Message[];
  onRegenerate?: () => void;
  onEdit?: (messageId: string, content: string) => void;
  onUpscale?: (messageId: string, seed: number, fullWidth: number, fullHeight: number) => void;
  streaming?: boolean;
}

export function MessageList({ messages, onRegenerate, onEdit, onUpscale, streaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef<number>(messages.length);

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  const lastUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].id;
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
          showRegenerateAction={message.id === lastAssistantId}
          showEditAction={message.id === lastUserId}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onUpscale={onUpscale ? (s, fw, fh) => onUpscale(message.id, s, fw, fh) : undefined}
          actionsDisabled={streaming}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
