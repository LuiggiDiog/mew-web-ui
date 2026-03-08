import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession, mockConvInsert, mockMsgInsert, mockMsgSelect, mockConvUpdate, mockChat } =
  vi.hoisted(() => ({
    mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
    mockConvInsert: vi.fn(),
    mockMsgInsert: vi.fn(),
    mockMsgSelect: vi.fn(),
    mockConvUpdate: vi.fn(),
    mockChat: vi.fn(),
  }));

vi.mock("@/modules/auth/lib/api-auth", () => ({
  getApiSession: vi.fn().mockResolvedValue({ session: mockSession, error: null }),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: mockConvInsert }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: mockMsgSelect }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: mockConvUpdate }),
    }),
  },
}));

vi.mock("@/db/schema", () => ({ conversations: {}, messages: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), asc: vi.fn() }));

vi.mock("@/modules/providers/lib/ollama", () => ({
  OllamaClient: vi.fn().mockImplementation(function() { return { chat: mockChat }; }),
}));

import { POST } from "./route";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { db } from "@/db";

async function* fakeStream() {
  yield "Hello ";
  yield "world!";
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApiSession).mockResolvedValue({ session: mockSession, error: null });
  // Reset db chain mocks
  vi.mocked(db.insert).mockReturnValue({
    values: vi.fn().mockReturnValue({ returning: mockConvInsert }),
  } as never);
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({ limit: mockMsgSelect }),
      }),
    }),
  } as never);
  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnValue({ where: mockConvUpdate }),
  } as never);
  mockConvInsert.mockResolvedValue([{ id: "conv-new" }]);
  mockMsgInsert.mockResolvedValue([]);
  mockMsgSelect.mockResolvedValue([]);
  mockConvUpdate.mockResolvedValue([]);
  mockChat.mockReturnValue(fakeStream());
});

describe("POST /api/chat", () => {
  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    vi.mocked(getApiSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hi", model: "llama3.2", provider: "ollama" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hi" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns a streaming response with X-Conversation-Id header", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hi", model: "llama3.2", provider: "ollama" }),
    });
    const res = await POST(req);
    expect(res.headers.get("X-Conversation-Id")).toBe("conv-new");
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toBe("Hello world!");
  });
});
