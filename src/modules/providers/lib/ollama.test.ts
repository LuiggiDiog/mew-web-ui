import { describe, it, expect, vi, beforeEach } from "vitest";
import { OllamaClient } from "./ollama";

const BASE_URL = "http://localhost:11434";

function makeClient() {
  return new OllamaClient(BASE_URL);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── isConnected ────────────────────────────────────────────────────────────

describe("OllamaClient.isConnected", () => {
  it("returns true when /api/tags responds with ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const client = makeClient();
    expect(await client.isConnected()).toBe(true);
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/tags`);
  });

  it("returns false when /api/tags responds with non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const client = makeClient();
    expect(await client.isConnected()).toBe(false);
  });

  it("returns false when fetch throws (Ollama not running)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const client = makeClient();
    expect(await client.isConnected()).toBe(false);
  });
});

// ─── listModels ─────────────────────────────────────────────────────────────

describe("OllamaClient.listModels", () => {
  it("returns the models array from /api/tags", async () => {
    const models = [
      { name: "llama3.2:latest", modified_at: "2024-01-01", size: 1000 },
      { name: "phi4:latest", modified_at: "2024-01-02", size: 2000 },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models }),
      })
    );
    const client = makeClient();
    const result = await client.listModels();
    expect(result).toEqual(models);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );
    const client = makeClient();
    await expect(client.listModels()).rejects.toThrow("Ollama returned 503");
  });

  it("throws when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const client = makeClient();
    await expect(client.listModels()).rejects.toThrow("Network error");
  });
});

// ─── chat ───────────────────────────────────────────────────────────────────

describe("OllamaClient.chat", () => {
  it("yields content chunks from the NDJSON stream", async () => {
    const lines = [
      JSON.stringify({ message: { content: "Hello" }, done: false }),
      JSON.stringify({ message: { content: " world" }, done: false }),
      JSON.stringify({ message: { content: "!" }, done: true }),
    ];
    const ndjson = lines.join("\n");
    const encoder = new TextEncoder();
    const uint8 = encoder.encode(ndjson);

    // Minimal ReadableStream mock
    let pos = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (pos < uint8.length) {
          controller.enqueue(uint8.slice(pos, pos + 32));
          pos += 32;
        } else {
          controller.close();
        }
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, body: stream })
    );

    const client = makeClient();
    const chunks: string[] = [];
    for await (const chunk of client.chat(
      [{ role: "user", content: "Hi" }],
      "llama3.2:latest"
    )) {
      chunks.push(chunk);
    }
    expect(chunks.join("")).toBe("Hello world!");
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );
    const client = makeClient();
    const gen = client.chat([{ role: "user", content: "Hi" }], "unknown");
    await expect(gen.next()).rejects.toThrow("Ollama returned 404");
  });

  it("sends correct request body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({ start(c) { c.close(); } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = makeClient();
    const messages = [{ role: "user", content: "test" }];
    // consume the generator
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of client.chat(messages, "llama3.2:latest")) { /* noop */ }

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/chat`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama3.2:latest", messages, stream: true }),
      })
    );
  });

  it("forwards abort signal to fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({ start(c) { c.close(); } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = makeClient();
    const controller = new AbortController();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of client.chat([{ role: "user", content: "test" }], "llama3.2:latest", controller.signal)) { /* noop */ }

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/chat`,
      expect.objectContaining({
        signal: controller.signal,
      })
    );
  });
});
