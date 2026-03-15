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
  const { activeModel, activeProvider, setStreamingMessageId, imageWidth, imageHeight, previewMode } =
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

        if (res.status === 401) {
          router.push("/login?reauth=1");
          router.refresh();
          return;
        }

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

      if (res.status === 401) {
        router.push("/login?reauth=1");
        router.refresh();
        return;
      }

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

        if (res.status === 401) {
          router.push("/login?reauth=1");
          router.refresh();
          return;
        }

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
    async (prompt: string, width: number = imageWidth, height: number = imageHeight, referenceImage?: string, denoise?: number) => {
      if (streaming) return;

      const userContent = referenceImage
        ? `[[ref:${referenceImage}]]${prompt}`
        : prompt;

      const userMsg: Message = {
        id: `optimistic-user-img-${Date.now()}`,
        conversationId,
        role: "user",
        content: userContent,
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
          body: JSON.stringify({
            prompt, conversationId, width, height, chatHistory, preview: previewMode,
            ...(referenceImage ? { referenceImage, denoise } : {}),
          }),
        });

        if (res.status === 401) {
          router.push("/login?reauth=1");
          router.refresh();
          return;
        }

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
    [conversationId, activeModel, streaming, router, setStreamingMessageId, messages, imageWidth, imageHeight, previewMode]
  );

  const handleUpscale = useCallback(
    async (messageId: string, seed: number, fullWidth: number, fullHeight: number) => {
      if (streaming) return;

      const msgIndex = messages.findIndex((m) => m.id === messageId);
      const precUserMsg = messages
        .slice(0, msgIndex)
        .reverse()
        .find((m) => m.role === "user" && (!m.type || m.type === "text"));
      if (!precUserMsg) return;

      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: "" } : m)));
      setStreaming(true);
      setStreamingMessageId(messageId);
      const abortController = new AbortController();
      requestAbortRef.current = abortController;

      try {
        const chatHistory = messages
          .slice(0, msgIndex)
          .filter((m) => !(m.type === "image" && m.role === "assistant"))
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            prompt: precUserMsg.content,
            conversationId,
            width: fullWidth,
            height: fullHeight,
            seed,
            chatHistory,
            skipUserMessage: true,
            replaceMessageId: messageId,
          }),
        });

        if (res.status === 401) {
          router.push("/login?reauth=1");
          router.refresh();
          return;
        }

        if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
        const { imageUrl } = await res.json();

        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: imageUrl } : m)));
        router.refresh();
      } catch (error) {
        if (isAbortError(error)) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: "Error: image generation failed.", type: "text" } : m
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
    [conversationId, messages, streaming, router, setStreamingMessageId]
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
              onUpscale={handleUpscale}
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
