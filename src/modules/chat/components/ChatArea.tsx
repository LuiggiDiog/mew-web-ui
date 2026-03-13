"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageList } from "@/modules/chat/components/MessageList";
import { ChatComposer } from "@/modules/chat/components/ChatComposer";
import { useChatStore } from "@/modules/chat/store/chatStore";
import type { Message } from "@/modules/chat/types";

interface ChatAreaProps {
  conversationId: string;
  initialMessages: Message[];
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function readStream(
  res: Response,
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  signal?: AbortSignal
): Promise<boolean> {
  if (!res.ok || !res.body) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: "Error: could not get response." } : m
      )
    );
    return false;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    if (signal?.aborted) return false;
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: accumulated } : m
      )
    );
  }

  return true;
}

export function ChatArea({ conversationId, initialMessages }: ChatAreaProps) {
  const router = useRouter();
  const { activeModel, activeProvider, setStreamingMessageId, imageWidth, imageHeight } =
    useChatStore();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const requestAbortRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    requestAbortRef.current?.abort();
  }, []);

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
            conversationId,
          }),
        });

        const ok = await readStream(res, assistantId, setMessages, abortController.signal);
        if (ok) router.refresh();
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
    [conversationId, activeModel, activeProvider, streaming, router, setStreamingMessageId]
  );

  const handleRegenerate = useCallback(async () => {
    if (streaming) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;

    const targetId = lastMsg.id;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetId ? { ...m, content: "", model: activeModel } : m
      )
    );
    setStreaming(true);
    setStreamingMessageId(targetId);
    const abortController = new AbortController();
    requestAbortRef.current = abortController;

    try {
      const res = await fetch("/api/chat/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          conversationId,
          model: activeModel,
        }),
      });

      const ok = await readStream(res, targetId, setMessages, abortController.signal);
      if (ok) router.refresh();
    } catch (error) {
      if (isAbortError(error)) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId ? { ...m, content: "Error: request failed." } : m
        )
      );
    } finally {
      if (requestAbortRef.current === abortController) {
        requestAbortRef.current = null;
      }
      setStreaming(false);
      setStreamingMessageId(null);
    }
  }, [conversationId, activeModel, messages, streaming, router, setStreamingMessageId]);

  const handleEdit = useCallback(
    async (messageId: string, content: string) => {
      if (streaming) return;

      const targetIndex = messages.findIndex(
        (m) => m.id === messageId && m.role === "user"
      );
      if (targetIndex === -1) return;

      const assistantId = `optimistic-assistant-edit-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        conversationId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        model: activeModel,
      };

      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === messageId && m.role === "user");
        if (index === -1) return prev;

        const kept = prev.slice(0, index + 1).map((m, i) =>
          i === index ? { ...m, content } : m
        );
        return [...kept, assistantMsg];
      });
      setStreaming(true);
      setStreamingMessageId(assistantId);
      const abortController = new AbortController();
      requestAbortRef.current = abortController;

      try {
        const res = await fetch("/api/chat/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            conversationId,
            messageId,
            content,
            model: activeModel,
          }),
        });

        const ok = await readStream(res, assistantId, setMessages, abortController.signal);
        if (ok) router.refresh();
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
    [conversationId, activeModel, messages, streaming, router, setStreamingMessageId]
  );

  const handleSendImage = useCallback(
    async (prompt: string, width: number = imageWidth, height: number = imageHeight) => {
      if (streaming) return;

      const userMsg: Message = {
        id: `optimistic-user-img-${Date.now()}`,
        conversationId,
        role: "user",
        content: prompt,
        type: "text",
        createdAt: new Date().toISOString(),
      };

      const assistantId = `optimistic-assistant-img-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        conversationId,
        role: "assistant",
        content: "",
        type: "image",
        createdAt: new Date().toISOString(),
        model: activeModel,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);
      setStreamingMessageId(assistantId);
      const abortController = new AbortController();
      requestAbortRef.current = abortController;

      try {
        const chatHistory = messages
          .filter((m) => !(m.type === "image" && m.role === "assistant"))
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({ prompt, conversationId, width, height, chatHistory }),
        });

        if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
        const { imageUrl } = await res.json();

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: imageUrl } : m))
        );
        router.refresh();
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
    [conversationId, activeModel, streaming, router, setStreamingMessageId, messages, imageWidth, imageHeight]
  );

  return (
    <>
      <main
        className="flex-1 overflow-y-auto flex flex-col-reverse"
        role="main"
        aria-label="Conversation messages"
        aria-busy={streaming}
      >
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-3 md:px-4 py-2 md:py-4">
          {messages.length > 0 ? (
            <MessageList
              messages={messages}
              onRegenerate={handleRegenerate}
              onEdit={handleEdit}
              streaming={streaming}
            />
          ) : (
            <div className="flex items-center justify-center h-full py-20">
              <p className="text-text-secondary text-sm">No messages yet.</p>
            </div>
          )}
        </div>
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
