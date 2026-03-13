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
    imageMode: false,
    imageWidth: 1024,
    imageHeight: 1024,
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
    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));
    expect(screen.getByText("No messages yet.")).toBeTruthy();
  });

  it("renders the composer", async () => {
    stubApiFetch(false);
    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));
    expect(screen.getByPlaceholderText(/Message/i)).toBeTruthy();
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
    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
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
    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
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
    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
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
    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
        target: { value: "Hello" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("stops streaming when stop generation is clicked", async () => {
    const mockFetch = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes("ollama/models") || url.includes("/api/settings")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      }
      if (url.includes("/api/chat")) {
        return new Promise((_, reject) => {
          const signal = options?.signal;
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal("fetch", mockFetch);

    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Message/i), {
        target: { value: "Stop this generation" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stop generation" })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Stop generation" }));
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Stop generation" })).toBeNull();
    });
  });
});

describe("ChatArea - regenerate", () => {
  it("shows regenerate button on last assistant message", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );
    expect(screen.getByRole("button", { name: "Regenerate response" })).toBeTruthy();
  });

  it("does not show regenerate button when there are no messages", async () => {
    stubApiFetch(false);
    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));
    expect(screen.queryByRole("button", { name: "Regenerate response" })).toBeNull();
  });

  it("calls /api/chat/regenerate and streams new response", async () => {
    stubApiFetch(true, "Regenerated answer");
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Regenerated answer")).toBeTruthy();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/chat/regenerate",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("shows error when regenerate API fails", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Error: could not get response.")).toBeTruthy();
    });
  });

  it("calls router.refresh after successful regeneration", async () => {
    stubApiFetch(true, "New response");
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

describe("ChatArea - edit message", () => {
  it("shows edit button on last user message", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );
    expect(screen.getByRole("button", { name: "Edit message" })).toBeTruthy();
  });

  it("calls /api/chat/edit and streams edited response", async () => {
    stubApiFetch(true, "Edited response");
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Edit message input")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Edit message input"), {
        target: { value: "Edited question" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save edited message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Edited question")).toBeTruthy();
      expect(screen.getByText("Edited response")).toBeTruthy();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/chat/edit",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("shows error when edit API fails", async () => {
    stubApiFetch(false);
    await act(async () =>
      render(<ChatArea conversationId="conv-1" initialMessages={INITIAL_MESSAGES} />)
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Edit message input")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Edit message input"), {
        target: { value: "Edited question" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save edited message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Error: could not get response.")).toBeTruthy();
    });
  });
});

describe("ChatArea image generation", () => {
  it("sends /api/image with prompt, conversationId and small size", async () => {
    const mockFetch = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes("ollama/models") || url.includes("/api/settings")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      }
      if (url.includes("/api/image")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ imageUrl: "/generated/test.png" }),
        });
      }
      if (url.includes("/api/chat")) {
        return Promise.resolve({ ok: false, body: null, headers: { get: () => null } });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal("fetch", mockFetch);

    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

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
          body: JSON.stringify({ prompt: "a cat", conversationId: "conv-1", width: 1024, height: 1024, chatHistory: [] }),
        })
      );
    });
  });

  it("adds optimistic user + assistant image placeholder and then updates with image", async () => {
    let resolveImage: ((value: { imageUrl: string }) => void) | null = null;
    const deferred = new Promise<{ imageUrl: string }>((resolve) => {
      resolveImage = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("ollama/models") || url.includes("/api/settings")) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
        }
        if (url.includes("/api/image")) {
          return Promise.resolve({ ok: true, json: () => deferred });
        }
        return Promise.resolve({ ok: false });
      })
    );

    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a cat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    expect(screen.getByText("a cat")).toBeTruthy();
    expect(screen.getByLabelText("Generating image")).toBeTruthy();

    resolveImage?.({ imageUrl: "/generated/test.png" });

    await waitFor(() => {
      const img = screen.getByRole("img", { name: "Generated image" }) as HTMLImageElement;
      expect(img.getAttribute("src")).toBe("/generated/test.png");
    });
  });

  it("sets assistant message to text error when image generation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("ollama/models") || url.includes("/api/settings")) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
        }
        if (url.includes("/api/image")) {
          return Promise.resolve({ ok: false, status: 503 });
        }
        return Promise.resolve({ ok: false });
      })
    );

    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a cat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Error: image generation failed.")).toBeTruthy();
    });
  });

  it("disables composer while generating an image", async () => {
    let resolveImage: ((value: { imageUrl: string }) => void) | null = null;
    const imagePromise = new Promise<{ imageUrl: string }>((resolve) => {
      resolveImage = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("ollama/models") || url.includes("/api/settings")) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
        }
        if (url.includes("/api/image")) {
          return Promise.resolve({ ok: true, json: () => imagePromise });
        }
        return Promise.resolve({ ok: false });
      })
    );

    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a cat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Toggle image mode" })).toBeDisabled();
    });

    resolveImage?.({ imageUrl: "/generated/test.png" });

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Generated image" })).toBeTruthy();
    });
  });

  it("calls router.refresh after successful image generation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("ollama/models") || url.includes("/api/settings")) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
        }
        if (url.includes("/api/image")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ imageUrl: "/generated/test.png" }),
          });
        }
        return Promise.resolve({ ok: false });
      })
    );

    await act(async () => render(<ChatArea conversationId="conv-1" initialMessages={[]} />));

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a cat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
