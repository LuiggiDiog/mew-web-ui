// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ConversationDrawer } from "./ConversationDrawer";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

// matchMedia not implemented in jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const TODAY_CONV = {
  id: "conv-today",
  title: "Today conversation",
  preview: "Preview text",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  model: "llama3.2",
  provider: "ollama",
  messageCount: 3,
};

function stubFetch(conversations = [TODAY_CONV], user = { displayName: "Alice", email: "alice@example.com" }) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, options?: RequestInit) => {
      if ((url as string).includes(`/api/conversations/${TODAY_CONV.id}`) && options?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      if ((url as string).includes("/api/conversations")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ conversations }),
        });
      }
      if ((url as string).includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user }),
        });
      }
      if ((url as string).includes("/api/auth/logout")) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  // Re-apply matchMedia mock after restoreAllMocks
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  useChatStore.setState({
    drawerOpen: false,
    selectedConversationId: null,
    activeModel: DEFAULT_MODEL,
    activeProvider: DEFAULT_PROVIDER,
    streamingMessageId: null,
  });
});

describe("ConversationDrawer", () => {
  it("shows 'New chat' button", async () => {
    stubFetch([]);
    await act(async () => render(<ConversationDrawer />));
    expect(screen.getByText("New chat")).toBeTruthy();
  });

  it("shows 'No conversations yet.' when list is empty", async () => {
    stubFetch([]);
    await act(async () => render(<ConversationDrawer />));
    await waitFor(() => {
      expect(screen.getByText("No conversations yet.")).toBeTruthy();
    });
  });

  it("renders conversation titles after fetch", async () => {
    stubFetch([TODAY_CONV]);
    await act(async () => render(<ConversationDrawer />));
    await waitFor(() => {
      expect(screen.getByText("Today conversation")).toBeTruthy();
    });
  });

  it("navigates to /chat when 'New chat' is clicked", async () => {
    stubFetch([]);
    await act(async () => render(<ConversationDrawer />));
    fireEvent.click(screen.getByText("New chat"));
    expect(mockPush).toHaveBeenCalledWith("/chat");
  });

  it("navigates to /chat/:id when a conversation is clicked", async () => {
    stubFetch([TODAY_CONV]);
    await act(async () => render(<ConversationDrawer />));
    await waitFor(() => screen.getByText("Today conversation"));
    fireEvent.click(screen.getByLabelText("Open conversation Today conversation"));
    expect(mockPush).toHaveBeenCalledWith(`/chat/${TODAY_CONV.id}`);
  });

  it("deletes a conversation after confirmation", async () => {
    stubFetch([TODAY_CONV]);
    await act(async () => render(<ConversationDrawer />));
    await waitFor(() => screen.getByText("Today conversation"));

    fireEvent.contextMenu(screen.getByLabelText("Open conversation Today conversation"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete chat" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Today conversation")).toBeNull();
    });
  });

  it("navigates to /chat when deleting the selected conversation", async () => {
    useChatStore.setState({ selectedConversationId: TODAY_CONV.id });
    stubFetch([TODAY_CONV]);
    await act(async () => render(<ConversationDrawer />));
    await waitFor(() => screen.getByText("Today conversation"));

    fireEvent.contextMenu(screen.getByLabelText("Open conversation Today conversation"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete chat" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/chat");
    });
  });

  it("shows user display name when logged in", async () => {
    stubFetch([]);
    await act(async () => render(<ConversationDrawer />));
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
  });

  it("navigates to /login after logout", async () => {
    stubFetch([]);
    await act(async () => render(<ConversationDrawer />));
    await waitFor(() => screen.getByLabelText("Sign out"));
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Sign out"));
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
