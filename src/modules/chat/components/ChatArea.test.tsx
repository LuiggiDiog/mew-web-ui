// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ChatArea } from "./ChatArea";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";
import type { Message } from "@/modules/chat/types";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    conversationId: "conv-1",
    role: "user",
    content: "Initial question",
    createdAt: "2026-03-07T10:00:00.000Z",
  },
  {
    id: "m2",
    conversationId: "conv-1",
    role: "assistant",
    content: "Initial answer",
    createdAt: "2026-03-07T10:00:10.000Z",
    model: "llama3.2",
  },
];

function makeStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function stubApiFetch(chatOk: boolean, streamText = "AI response") {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if ((url as string).includes("ollama/models") || (url as string).includes("/api/settings")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      }
      if ((url as string).includes("/api/chat")) {
        return Promise.resolve({
          ok: chatOk,
          body: chatOk ? makeStream(streamText) : null,
          headers: { get: () => null },
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

describe("ChatArea", () => {
  it("renders initial messages", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );
    expect(screen.getByText("Initial question")).toBeTruthy();
    expect(screen.getByText("Initial answer")).toBeTruthy();
  });

  it("shows 'No messages yet.' when initialMessages is empty", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={[]} />)
    );
    expect(screen.getByText("No messages yet.")).toBeTruthy();
  });

  it("renders the composer", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={[]} />)
    );
    expect(screen.getByPlaceholderText("Message…")).toBeTruthy();
  });

  it("uses compact mobile spacing in the scroll area", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );

    const main = screen.getByRole("main");
    expect(main.getAttribute("aria-label")).toBe("Conversation messages");
    expect(main.getAttribute("aria-busy")).toBe("false");
    const wrapper = main.firstElementChild as HTMLElement | null;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain("w-full");
    expect(wrapper?.className).toContain("max-w-4xl");
    expect(wrapper?.className).toContain("px-2");
    expect(wrapper?.className).toContain("sm:px-3");
    expect(wrapper?.className).toContain("md:px-4");
    expect(wrapper?.className).toContain("py-2");
    expect(wrapper?.className).toContain("md:py-4");
  });
  it("adds user message optimistically after sending", async () => {
    stubApiFetch(true, "Great answer");
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={[]} />)
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
        target: { value: "New question" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("New question")).toBeTruthy();
    });
  });

  it("shows streamed assistant response", async () => {
    stubApiFetch(true, "Great answer");
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={[]} />)
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
        target: { value: "Tell me something" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Great answer")).toBeTruthy();
    });
  });

  it("shows error message when API call fails", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={[]} />)
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
        target: { value: "Hello" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Error: could not get response.")).toBeTruthy();
    });
  });

  it("calls router.refresh after streaming completes", async () => {
    stubApiFetch(true, "Done");
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={[]} />)
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Message…"), {
        target: { value: "Hello" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

