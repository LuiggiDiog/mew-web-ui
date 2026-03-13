"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/modules/chat/components/EmptyState";
import { MessageList } from "@/modules/chat/components/MessageList";
import { ChatComposer } from "@/modules/chat/components/ChatComposer";
import { useChatStore } from "@/modules/chat/store/chatStore";
import type { Message } from "@/modules/chat/types";

interface NewChatAreaProps {
  welcomeSeed?: number;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function NewChatArea({ welcomeSeed = 0 }: NewChatAreaProps) {
  const router = useRouter();
  const { activeModel, activeProvider, setStreamingMessageId, imageWidth, imageHeight, previewMode } =
    useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const requestAbortRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    requestAbortRef.current?.abort();
  }, []);

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
      const abortController = new AbortController();
      requestAbortRef.current = abortController;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
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
      } catch (error) {
        if (isAbortError(error)) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "Error: request failed." } : m
          )
        );
      } finally {
        if (requestAbortRef.current === abortController) {
          requestAbortRef.current = null;
        }
        setStreaming(false);
        setStreamingMessageId(null);
      }
    },
    [activeModel, activeProvider, streaming, router, setStreamingMessageId]
  );

  const handleSendImage = useCallback(
    async (prompt: string, width: number = imageWidth, height: number = imageHeight, referenceImage?: string, denoise?: number) => {
      if (streaming) return;

      const tempConvId = "new";
      const userContent = referenceImage
        ? `[[ref:${referenceImage}]]${prompt}`
        : prompt;

      const userMsg: Message = {
        id: `optimistic-user-img-${Date.now()}`,
        conversationId: tempConvId,
        role: "user",
        content: userContent,
        type: "text",
        createdAt: new Date().toISOString(),
      };
      const assistantId = `optimistic-assistant-img-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        conversationId: tempConvId,
        role: "assistant",
        content: "",
        type: "image",
        createdAt: new Date().toISOString(),
        model: activeModel,
      };

      setMessages([userMsg, assistantMsg]);
      setStreaming(true);
      setStreamingMessageId(assistantId);
      const abortController = new AbortController();
      requestAbortRef.current = abortController;

      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            prompt, width, height, preview: previewMode,
            ...(referenceImage ? { referenceImage, denoise } : {}),
          }),
        });

        if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
        const { imageUrl, conversationId: newConvId } = await res.json();

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: imageUrl } : m))
        );

        if (newConvId) {
          router.push(`/chat/${newConvId}`);
        }
      } catch (error) {
        if (isAbortError(error)) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Error: image generation failed.", type: "text" }
              : m
          )
        );
      } finally {
        if (requestAbortRef.current === abortController) {
          requestAbortRef.current = null;
        }
        setStreaming(false);
        setStreamingMessageId(null);
      }
    },
    [activeModel, streaming, router, setStreamingMessageId, imageWidth, imageHeight, previewMode]
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
      <ChatComposer
        onSend={handleSend}
        onSendImage={handleSendImage}
        onStop={handleStop}
        disabled={streaming}
        streaming={streaming}
      />
    </>
  );
}
