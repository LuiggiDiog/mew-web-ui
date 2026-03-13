import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ComfyUIClient } from ".";

const BASE_URL = "http://localhost:8188";

function makeClient() {
  return new ComfyUIClient(BASE_URL);
}

describe("ComfyUIClient.isConnected", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when UNETLoader endpoint responds ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const client = makeClient();
    expect(await client.isConnected()).toBe(true);
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/object_info/UNETLoader`);
  });

  it("returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const client = makeClient();
    expect(await client.isConnected()).toBe(false);
  });
});

describe("ComfyUIClient.listModels", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses UNET model names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            UNETLoader: {
              input: {
                required: {
                  unet_name: [["z_image_turbo.safetensors", "other.safetensors"]],
                },
              },
            },
          }),
      })
    );

    const client = makeClient();
    await expect(client.listModels()).resolves.toEqual([
      { name: "z_image_turbo.safetensors" },
      { name: "other.safetensors" },
    ]);
  });

  it("throws when response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const client = makeClient();
    await expect(client.listModels()).rejects.toThrow("ComfyUI returned 503");
  });
});

describe("ComfyUIClient.generate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("submits workflow, polls history, and fetches image", async () => {
    const imageArrayBuffer = new Uint8Array([1, 2, 3]).buffer;

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ prompt_id: "prompt-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            "prompt-1": {
              outputs: {
                "9": {
                  images: [
                    {
                      filename: "image.png",
                      subfolder: "",
                      type: "output",
                    },
                  ],
                },
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageArrayBuffer),
      });
    vi.stubGlobal("fetch", mockFetch);

    const client = makeClient();
    const promise = client.generate("a red cat", 512, 512);

    await vi.advanceTimersByTimeAsync(1_000);

    const result = await promise;
    expect(result.buffer).toEqual(Buffer.from(imageArrayBuffer));
    expect(typeof result.seed).toBe("number");

    const submitCall = mockFetch.mock.calls[0];
    expect(submitCall[0]).toBe(`${BASE_URL}/prompt`);
    const submitBody = JSON.parse((submitCall[1] as RequestInit).body as string);

    expect(submitBody.client_id).toBeTypeOf("string");
    expect(submitBody.prompt["6"].inputs.text).toBe("a red cat");
    expect(submitBody.prompt["13"].inputs.width).toBe(512);
    expect(submitBody.prompt["13"].inputs.height).toBe(512);

    expect(mockFetch.mock.calls[1][0]).toBe(`${BASE_URL}/history/prompt-1`);
    expect(mockFetch.mock.calls[2][0]).toContain(`${BASE_URL}/view?`);
  });

  it("uses 1024x1024 workflow for large images", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ prompt_id: "prompt-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            "prompt-1": {
              outputs: {
                "9": {
                  images: [{ filename: "image.png", subfolder: "", type: "output" }],
                },
              },
            },
          }),
      })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new Uint8Array([7]).buffer) });
    vi.stubGlobal("fetch", mockFetch);

    const client = makeClient();
    const promise = client.generate("mountain", 1024, 1024);
    await vi.advanceTimersByTimeAsync(1_000);
    await promise;

    const submitBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(submitBody.prompt["13"].inputs.width).toBe(1024);
    expect(submitBody.prompt["13"].inputs.height).toBe(1024);
  });

  it("throws when prompt submission fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const client = makeClient();
    await expect(client.generate("test", 512, 512)).rejects.toThrow(
      "ComfyUI prompt submission failed: 500"
    );
  });

  it("times out after 120 seconds of polling", async () => {
    const mockFetch = vi.fn((url: string) => {
      if (url.endsWith("/prompt")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ prompt_id: "prompt-timeout" }),
        });
      }

      if (url.includes("/history/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }

      return Promise.resolve({ ok: false, status: 500 });
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = makeClient();
    const promise = client.generate("slow", 512, 512);
    const assertion = expect(promise).rejects.toThrow("ComfyUI generation timed out");

    await vi.advanceTimersByTimeAsync(121_000);

    await assertion;
  });
});
