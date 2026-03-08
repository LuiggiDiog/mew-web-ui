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
      // ModelSelector API calls — return unreachable so it renders "No model"
      if ((url as string).includes("ollama/models") || (url as string).includes("/api/settings")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      }
      // Chat API
      if ((url as string).includes("/api/chat")) {
        return Promise.resolve({
          ok: chatResponse.ok,
          body: chatResponse.body ?? null,
          headers: {
            get: (h: string) => (h === "X-Conversation-Id" ? (chatResponse.convId ?? null) : null),
          },
        });
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
    expect(screen.getByText("Good morning.")).toBeTruthy();
  });

  it("renders the composer", async () => {
    stubApiFetch({ ok: false });
    await act(async () => render(<NewChatArea />));
    expect(screen.getByPlaceholderText("Message…")).toBeTruthy();
  });

  it("adds user message optimistically after sending", async () => {
    stubApiFetch({ ok: true, body: makeStream("Hello!"), convId: "conv-new" });
    await act(async () => render(<NewChatArea />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
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
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
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
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
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
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
        target: { value: "Hi" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Error: could not get response.")).toBeTruthy();
    });
  });
});
