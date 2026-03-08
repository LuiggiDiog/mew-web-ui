// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { DefaultModelPicker } from "./DefaultModelPicker";

const MODELS = [
  { name: "llama3.2:latest", modified_at: "2024-01-01", size: 1000 },
  { name: "phi4:latest", modified_at: "2024-01-02", size: 2000 },
];

function stubFetch(modelsPayload: unknown, settingsPayload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if ((url as string).includes("ollama/models")) {
        return Promise.resolve({
          ok: modelsPayload !== null,
          json: () => Promise.resolve(modelsPayload),
        });
      }
      return Promise.resolve({
        ok: settingsPayload !== null,
        json: () => Promise.resolve(settingsPayload),
      });
    })
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("DefaultModelPicker", () => {
  it("shows loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<DefaultModelPicker />);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("shows Ollama unreachable when models fetch returns no models", async () => {
    stubFetch(null, null);
    await act(async () => render(<DefaultModelPicker />));
    await waitFor(() => {
      expect(screen.getByText("Ollama unreachable")).toBeTruthy();
    });
  });

  it("renders a select with all models after fetch", async () => {
    stubFetch({ models: MODELS }, { defaultModel: "" });
    await act(async () => render(<DefaultModelPicker />));
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeTruthy();
    });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(MODELS.length);
    expect(options[0].textContent).toBe("llama3.2:latest");
    expect(options[1].textContent).toBe("phi4:latest");
  });

  it("pre-selects the saved defaultModel from settings", async () => {
    stubFetch({ models: MODELS }, { defaultModel: "phi4:latest" });
    await act(async () => render(<DefaultModelPicker />));
    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("phi4:latest");
    });
  });

  it("falls back to first model when saved model is not in list", async () => {
    stubFetch({ models: MODELS }, { defaultModel: "unknown-model" });
    await act(async () => render(<DefaultModelPicker />));
    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("llama3.2:latest");
    });
  });

  it("calls PATCH /api/settings when selection changes", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if ((url as string).includes("ollama/models")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ models: MODELS }) });
      }
      if (init?.method === "PATCH") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ defaultModel: "" }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => render(<DefaultModelPicker />));
    await waitFor(() => screen.getByRole("combobox"));

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "phi4:latest" } });
    });

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) => (url as string).includes("settings") && (init as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeTruthy();
      expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
        defaultModel: "phi4:latest",
      });
    });
  });
});
