// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { NewChatArea } from "./NewChatArea";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

function makeStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function stubApiFetch(chatResponse: { ok: boolean; body?: ReadableStream<Uint8Array>; convId?: string }) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if ((url as string).includes("ollama/models") || (url as string).includes("/api/settings")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      }
      if ((url as string).includes("/api/chat")) {
        return Promise.resolve({
          ok: chatResponse.ok,
          body: chatResponse.body ?? null,
          headers: {
            get: (h: string) => (h === "X-Conversation-Id" ? (chatResponse.convId ?? null) : null),
          },
        });
      }
      if ((url as string).includes("/api/image")) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: false });
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  useChatStore.setState({
    drawerOpen: false,
    selectedConversationId: null,
    activeModel: DEFAULT_MODEL,
    activeProvider: DEFAULT_PROVIDER,
    streamingMessageId: null,
  });
});

describe("NewChatArea", () => {
  it("shows EmptyState when no messages", async () => {
    stubApiFetch({ ok: false });
    await act(async () => render(<NewChatArea />));
    expect(screen.getByText("Explain something")).toBeTruthy();
  });

  it("renders the composer", async () => {
    stubApiFetch({ ok: false });
    await act(async () => render(<NewChatArea />));
    expect(screen.getByPlaceholderText(/Message/i)).toBeTruthy();
  });

  it("adds user message optimistically after sending", async () => {
    stubApiFetch({ ok: true, body: makeStream("Hello!"), convId: "conv-new" });
    await act(async () => render(<NewChatArea />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
        target: { value: "My question" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("My question")).toBeTruthy();
    });
  });

  it("shows streamed assistant response", async () => {
    stubApiFetch({ ok: true, body: makeStream("Hello from AI!"), convId: "conv-new" });
    await act(async () => render(<NewChatArea />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
        target: { value: "Hi" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Hello from AI!")).toBeTruthy();
    });
  });

  it("navigates to the new conversation after streaming", async () => {
    stubApiFetch({ ok: true, body: makeStream("Hi!"), convId: "conv-xyz" });
    await act(async () => render(<NewChatArea />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
        target: { value: "Hello" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/chat/conv-xyz");
    });
  });

  it("shows error message when API call fails", async () => {
    stubApiFetch({ ok: false });
    await act(async () => render(<NewChatArea />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
        target: { value: "Hi" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Error: could not get response.")).toBeTruthy();
    });
  });
});

describe("NewChatArea image generation", () => {
  it("posts /api/image without conversationId and navigates to new conversation", async () => {
    const mockFetch = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes("ollama/models") || url.includes("/api/settings")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      }
      if (url.includes("/api/image")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            imageUrl: "/generated/test.png",
            conversationId: "new-conv-id",
          }),
        });
      }
      if (url.includes("/api/chat")) {
        return Promise.resolve({ ok: false, body: null, headers: { get: () => null } });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal("fetch", mockFetch);

    await act(async () => render(<NewChatArea />));

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a cat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/image",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ prompt: "a cat", size: "small" }),
        })
      );
    });

    const imageCall = mockFetch.mock.calls.find((call) => (call[0] as string).includes("/api/image"));
    const parsed = JSON.parse((imageCall?.[1] as RequestInit).body as string);
    expect(parsed.conversationId).toBeUndefined();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/chat/new-conv-id");
    });
  });

  it("shows optimistic image placeholder and updates image on success", async () => {
    let resolveImage: ((value: { imageUrl: string; conversationId: string }) => void) | null = null;
    const deferred = new Promise<{ imageUrl: string; conversationId: string }>((resolve) => {
      resolveImage = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("ollama/models") || url.includes("/api/settings")) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
        }
        if (url.includes("/api/image")) {
          return Promise.resolve({
            ok: true,
            json: () => deferred,
          });
        }
        return Promise.resolve({ ok: false });
      })
    );

    await act(async () => render(<NewChatArea />));

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a cat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    expect(screen.getByText("a cat")).toBeTruthy();
    expect(screen.getByLabelText("Assistant is thinking")).toBeTruthy();

    resolveImage?.({
      imageUrl: "/generated/test.png",
      conversationId: "new-conv-id",
    });

    await waitFor(() => {
      const img = screen.getByRole("img", { name: "Generated image" }) as HTMLImageElement;
      expect(img.getAttribute("src")).toBe("/generated/test.png");
    });
  });
});
