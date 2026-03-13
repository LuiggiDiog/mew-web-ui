import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSession,
  mockInsertValues,
  mockConvInsert,
  mockWhere,
  mockConvUpdate,
  mockComfyGenerate,
  mockOllamaChat,
  mockWriteFile,
  mockMkdir,
} = vi.hoisted(() => ({
  mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
  mockInsertValues: vi.fn(),
  mockConvInsert: vi.fn(),
  mockWhere: vi.fn(),
  mockConvUpdate: vi.fn(),
  mockComfyGenerate: vi.fn(),
  mockOllamaChat: vi.fn(),
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
}));

vi.mock("@/modules/auth/lib/api-auth", () => ({
  getApiSession: vi.fn().mockResolvedValue({ session: mockSession, error: null }),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  conversations: {},
  messages: {},
  settings: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock("@/modules/providers/lib/comfyui", () => ({
  ComfyUIClient: vi.fn().mockImplementation(function () {
    return { generate: mockComfyGenerate };
  }),
}));

vi.mock("@/modules/providers/lib/ollama", () => ({
  OllamaClient: vi.fn().mockImplementation(function () {
    return { chat: mockOllamaChat };
  }),
}));

vi.mock("fs/promises", () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

import { POST } from "./route";
import { db } from "@/db";
import { getApiSession } from "@/modules/auth/lib/api-auth";

const OWNED_CONV_ID = "9da06df8-6bb7-4c4d-82b2-b337407030a6";
const NEW_CONV_ID = "0dcf0af0-46cf-4866-a978-a695fd7f75f0";

async function* fakeChatStream(...chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(getApiSession).mockResolvedValue({ session: mockSession, error: null });

  vi.mocked(db.insert).mockReturnValue({ values: mockInsertValues } as never);
  mockInsertValues.mockImplementation((values: unknown) => {
    if (
      typeof values === "object" &&
      values !== null &&
      "userId" in values &&
      "provider" in values
    ) {
      return { returning: mockConvInsert };
    }

    return Promise.resolve([]);
  });

  mockConvInsert.mockResolvedValue([{ id: NEW_CONV_ID }]);

  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: mockWhere,
    }),
  } as never);
  mockWhere.mockResolvedValue([]);

  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnValue({ where: mockConvUpdate }),
  } as never);
  mockConvUpdate.mockResolvedValue([]);

  mockComfyGenerate.mockResolvedValue({ buffer: Buffer.from("png"), seed: 42 });
  mockOllamaChat.mockReturnValue(fakeChatStream());
  mockWriteFile.mockResolvedValue(undefined);
  mockMkdir.mockResolvedValue(undefined);
});

describe("POST /api/image", () => {
  it("returns 400 when prompt is missing", async () => {
    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "prompt is required" });
  });

  it("returns 400 when prompt exceeds max length", async () => {
    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "a".repeat(2001) }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "prompt exceeds max length (2000)" });
  });

  it("returns 400 when conversationId is not a valid UUID", async () => {
    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "hello", conversationId: "not-a-uuid" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "conversationId must be a valid UUID",
    });
  });

  it("returns auth error when session is missing", async () => {
    const { NextResponse } = await import("next/server");
    vi.mocked(getApiSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("uses existing conversation and stores user + assistant image messages", async () => {
    mockWhere
      .mockResolvedValueOnce([{ id: OWNED_CONV_ID, userId: mockSession.userId }])
      .mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "a cat on a sofa", conversationId: OWNED_CONV_ID }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      imageUrl: expect.stringMatching(/^\/generated\/.+\.png$/),
      conversationId: OWNED_CONV_ID,
      seed: expect.any(Number),
      fullWidth: 1024,
      fullHeight: 1024,
    });

    expect(mockComfyGenerate).toHaveBeenCalledWith("a cat on a sofa", 1024, 1024, undefined);
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining("generated"), expect.any(Buffer));

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: OWNED_CONV_ID,
        role: "user",
        type: "text",
        content: "a cat on a sofa",
      })
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: OWNED_CONV_ID,
        role: "assistant",
        type: "image",
        content: json.imageUrl,
      })
    );
  });

  it("creates a new conversation when conversationId is missing", async () => {
    const prompt = "A very long prompt that should be truncated in the title when creating conversation automatically in api image route";

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.conversationId).toBe(NEW_CONV_ID);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockSession.userId,
        provider: "comfyui",
        title: prompt.slice(0, 60),
      })
    );
  });

  it("uses custom dimensions when width and height are provided", async () => {
    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "a city skyline", width: 1024, height: 576 }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req as never);
    expect(mockComfyGenerate).toHaveBeenCalledWith("a city skyline", 1024, 576, undefined);
  });

  it("uses default 1024×1024 when dimensions are omitted", async () => {
    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "a city skyline" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req as never);
    expect(mockComfyGenerate).toHaveBeenCalledWith("a city skyline", 1024, 1024, undefined);
  });

  it("uses default 1024×1024 when dimensions are out of range", async () => {
    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "a city skyline", width: 100, height: 100 }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req as never);
    expect(mockComfyGenerate).toHaveBeenCalledWith("a city skyline", 1024, 1024, undefined);
  });

  it("returns 504 on ComfyUI timeout", async () => {
    mockComfyGenerate.mockRejectedValue(new Error("timed out"));

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "slow image" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(504);
    await expect(res.json()).resolves.toEqual({ error: "Image generation timed out" });
  });

  it("returns 503 on generic ComfyUI errors", async () => {
    mockComfyGenerate.mockRejectedValue(new Error("connection refused"));

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "image" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never);
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "ComfyUI unreachable" });
  });

  it("enhances prompt with Ollama when enhancePrompt is true", async () => {
    mockWhere.mockResolvedValueOnce([
      { key: "enhancePrompt", value: "true" },
      { key: "defaultModel", value: "llama3.2" },
    ]);

    mockOllamaChat.mockReturnValue(fakeChatStream("enhanced final prompt"));

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "simple prompt" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req as never);

    expect(mockOllamaChat).toHaveBeenCalledWith(
      [
        expect.objectContaining({ role: "system" }),
        { role: "user", content: "simple prompt" },
      ],
      "llama3.2"
    );

    expect(mockComfyGenerate).toHaveBeenCalledWith("enhanced final prompt", 1024, 1024, undefined);
  });

  it("does not call Ollama when enhancePrompt is missing", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "original prompt" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req as never);

    expect(mockOllamaChat).not.toHaveBeenCalled();
    expect(mockComfyGenerate).toHaveBeenCalledWith("original prompt", 1024, 1024, undefined);
  });

  it("does not call Ollama when enhancePrompt is false", async () => {
    mockWhere.mockResolvedValueOnce([{ key: "enhancePrompt", value: "false" }]);

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "original prompt" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req as never);

    expect(mockOllamaChat).not.toHaveBeenCalled();
    expect(mockComfyGenerate).toHaveBeenCalledWith("original prompt", 1024, 1024, undefined);
  });

  it("falls back to original prompt if Ollama enhancement fails", async () => {
    mockWhere.mockResolvedValueOnce([
      { key: "enhancePrompt", value: "true" },
      { key: "defaultModel", value: "llama3.2" },
    ]);

    mockOllamaChat.mockImplementation(() => {
      throw new Error("ollama down");
    });

    const req = new Request("http://localhost/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "original prompt" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req as never);

    expect(mockOllamaChat).toHaveBeenCalled();
    expect(mockComfyGenerate).toHaveBeenCalledWith("original prompt", 1024, 1024, undefined);
  });
});
