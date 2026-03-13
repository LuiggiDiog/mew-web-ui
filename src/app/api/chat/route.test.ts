import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession, mockConvInsert, mockInsertValues, mockWhere, mockConvUpdate, mockChat } =
  vi.hoisted(() => ({
    mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
    mockConvInsert: vi.fn(),
    mockInsertValues: vi.fn(),
    mockWhere: vi.fn(),
    mockConvUpdate: vi.fn(),
    mockChat: vi.fn(),
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

vi.mock("@/db/schema", () => ({ conversations: {}, messages: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), asc: vi.fn(), desc: vi.fn() }));

vi.mock("@/modules/providers/lib/ollama", () => ({
  OllamaClient: vi.fn().mockImplementation(function() { return { chat: mockChat }; }),
}));

import { POST } from "./route";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { db } from "@/db";

function createWhereResult<TDirect, TLimited = TDirect>(
  directRows: TDirect,
  limitedRows?: TLimited
) {
  const limit = vi.fn().mockResolvedValue(
    (limitedRows ?? directRows) as TDirect | TLimited
  );
  const orderBy = vi.fn().mockReturnValue({ limit });
  const result = Promise.resolve(directRows) as Promise<TDirect> & {
    orderBy: typeof orderBy;
  };
  result.orderBy = orderBy;
  return result;
}

async function* fakeStream() {
  yield "Hello ";
  yield "world!";
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApiSession).mockResolvedValue({ session: mockSession, error: null });

  vi.mocked(db.insert).mockReturnValue({
    values: mockInsertValues,
  } as never);
  mockInsertValues.mockImplementation((values: unknown) => {
    if (typeof values === "object" && values !== null && "userId" in values) {
      return { returning: mockConvInsert };
    }
    return Promise.resolve([]);
  });

  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: mockWhere,
    }),
  } as never);
  mockWhere.mockReturnValue(createWhereResult([], []));

  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnValue({ where: mockConvUpdate }),
  } as never);

  mockConvInsert.mockResolvedValue([{ id: "conv-new" }]);
  mockConvUpdate.mockResolvedValue([]);
  mockChat.mockReturnValue(fakeStream());
});

describe("POST /api/chat", () => {
  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

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

  it("returns 400 when message exceeds max length", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "a".repeat(20_001),
        model: "llama3.2",
        provider: "ollama",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when conversationId is not a UUID", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hi",
        model: "llama3.2",
        provider: "ollama",
        conversationId: "not-a-uuid",
      }),
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

  it("returns 404 and performs no writes when conversationId is not owned by user", async () => {
    mockWhere.mockReturnValueOnce(createWhereResult([], []));

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hi",
        model: "llama3.2",
        provider: "ollama",
        conversationId: "9da06df8-6bb7-4c4d-82b2-b337407030a6",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it("uses history from the requested conversation when conversationId is owned by user", async () => {
    const ownedConversationRows = [
      { id: "9da06df8-6bb7-4c4d-82b2-b337407030a6", userId: "user-1" },
    ];
    const historyRows = [
      { role: "user", content: "Question" },
      { role: "assistant", content: "Answer" },
    ];

    mockWhere
      .mockReturnValueOnce(createWhereResult(ownedConversationRows, ownedConversationRows))
      .mockReturnValueOnce(createWhereResult(historyRows, historyRows));

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Follow-up",
        model: "llama3.2",
        provider: "ollama",
        conversationId: "9da06df8-6bb7-4c4d-82b2-b337407030a6",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Conversation-Id")).toBe("9da06df8-6bb7-4c4d-82b2-b337407030a6");
    expect(mockChat).toHaveBeenCalledWith(
      [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ],
      "llama3.2",
      expect.any(AbortSignal)
    );
  });
});
