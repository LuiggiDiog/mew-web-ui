"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/modules/chat/components/MessageBubble";
import type { Message } from "@/modules/chat/types";

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef<number>(messages.length);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 py-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
