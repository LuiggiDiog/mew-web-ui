// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ProvidersList } from ".";

const MOCK_PROVIDERS = [
  {
    id: "p-1",
    name: "Ollama",
    type: "local",
    baseUrl: "http://localhost:11434",
    isActive: true,
    connected: true,
  },
  {
    id: "p-2",
    name: "OpenAI",
    type: "external",
    baseUrl: null,
    isActive: false,
    connected: false,
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ProvidersList", () => {
  it("shows empty message when no providers returned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: [] }),
    }));
    await act(async () => render(<ProvidersList />));
    await waitFor(() => {
      expect(screen.getByText("No providers configured.")).toBeTruthy();
    });
  });

  it("renders provider names after fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: MOCK_PROVIDERS }),
    }));
    await act(async () => render(<ProvidersList />));
    await waitFor(() => {
      expect(screen.getByText("Ollama")).toBeTruthy();
      expect(screen.getByText("OpenAI")).toBeTruthy();
    });
  });

  it("shows baseUrl for providers that have one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: MOCK_PROVIDERS }),
    }));
    await act(async () => render(<ProvidersList />));
    await waitFor(() => {
      expect(screen.getByText("http://localhost:11434")).toBeTruthy();
    });
  });

  it("shows 'API key required' for providers without baseUrl", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: MOCK_PROVIDERS }),
    }));
    await act(async () => render(<ProvidersList />));
    await waitFor(() => {
      expect(screen.getByText("API key required")).toBeTruthy();
    });
  });

  it("shows 'Active' badge for connected provider", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: MOCK_PROVIDERS }),
    }));
    await act(async () => render(<ProvidersList />));
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeTruthy();
    });
  });

  it("shows 'Inactive' badge for inactive provider", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: MOCK_PROVIDERS }),
    }));
    await act(async () => render(<ProvidersList />));
    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeTruthy();
    });
  });

  it("renders empty when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    await act(async () => render(<ProvidersList />));
    await waitFor(() => {
      expect(screen.getByText("No providers configured.")).toBeTruthy();
    });
  });
});
