// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { ModelSelector } from ".";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";

const MODELS = [
  { name: "llama3.2:latest", modified_at: "2024-01-01", size: 1000 },
  { name: "phi4:latest", modified_at: "2024-01-02", size: 2000 },
];

function stubFetch(models: unknown, defaultModel = "") {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if ((url as string).includes("ollama/models")) {
        return Promise.resolve({
          ok: models !== null,
          json: () => Promise.resolve(models ? { models } : null),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ defaultModel }),
      });
    })
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  useChatStore.setState({
    drawerOpen: false,
    selectedConversationId: null,
    activeModel: DEFAULT_MODEL,
    activeProvider: DEFAULT_PROVIDER,
    streamingMessageId: null,
  });
});

describe("ModelSelector", () => {
  it("shows Loading... before models are fetched", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<ModelSelector />);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("shows 'No model' when Ollama is unreachable", async () => {
    stubFetch(null);
    await act(async () => render(<ModelSelector />));
    await waitFor(() => {
      expect(screen.getByText("No model")).toBeTruthy();
    });
  });

  it("shows active model name after models load", async () => {
    stubFetch(MODELS, "llama3.2:latest");
    await act(async () => render(<ModelSelector />));
    await waitFor(() => {
      expect(screen.getByText("llama3.2:latest")).toBeTruthy();
    });
  });

  it("sets defaultModel from settings in the store", async () => {
    stubFetch(MODELS, "phi4:latest");
    await act(async () => render(<ModelSelector />));
    await waitFor(() => {
      expect(useChatStore.getState().activeModel).toBe("phi4:latest");
    });
  });

  it("falls back to first model when defaultModel is not in list", async () => {
    stubFetch(MODELS, "unknown-model");
    await act(async () => render(<ModelSelector />));
    await waitFor(() => {
      expect(useChatStore.getState().activeModel).toBe("llama3.2:latest");
    });
  });

  it("opens dropdown when button is clicked", async () => {
    stubFetch(MODELS, "");
    await act(async () => render(<ModelSelector />));
    await waitFor(() => screen.getByText("llama3.2:latest"));

    fireEvent.click(screen.getByRole("button", { name: /select model/i }));
    // Dropdown section header "Ollama" appears (as text node in the header div)
    expect(screen.getAllByText("Ollama").length).toBeGreaterThan(0);
  });

  it("updates store when a model is selected from dropdown", async () => {
    stubFetch(MODELS, "");
    await act(async () => render(<ModelSelector />));
    await waitFor(() => screen.getByText("llama3.2:latest"));

    // open dropdown
    fireEvent.click(screen.getByRole("button", { name: /select model/i }));

    // click phi4:latest option button
    const modelButtons = screen.getAllByRole("button");
    const phi4Button = modelButtons.find((b) => b.textContent === "phi4:latest");
    expect(phi4Button).toBeTruthy();
    fireEvent.click(phi4Button!);

    expect(useChatStore.getState().activeModel).toBe("phi4:latest");
    expect(useChatStore.getState().activeProvider).toBe("ollama");
  });

  it("keeps selected model in one line with truncation classes", async () => {
    const longModel = "hf.co/mradermacher/Dolphin-Mistral-24B-Venice-Edition-GGUF:Q4_K_M";
    stubFetch([{ name: longModel, modified_at: "2024-01-01", size: 1000 }], longModel);
    await act(async () => render(<ModelSelector />));

    await waitFor(() => {
      const modelText = screen.getByText(longModel);
      expect(modelText.className).toContain("truncate");
      expect(modelText.getAttribute("title")).toBe(longModel);
    });
  });
});
