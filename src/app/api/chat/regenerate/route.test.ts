import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession, mockInsertValues, mockWhere, mockConvUpdate, mockChat, mockDelete } =
  vi.hoisted(() => ({
    mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
    mockInsertValues: vi.fn(),
    mockWhere: vi.fn(),
    mockConvUpdate: vi.fn(),
    mockChat: vi.fn(),
    mockDelete: vi.fn(),
  }));

vi.mock("@/modules/auth/lib/api-auth", () => ({
  getApiSession: vi.fn().mockResolvedValue({ session: mockSession, error: null }),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({ conversations: {}, messages: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), asc: vi.fn(), desc: vi.fn() }));

vi.mock("@/modules/providers/lib/ollama", () => ({
  OllamaClient: vi.fn().mockImplementation(function () {
    return { chat: mockChat };
  }),
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

const CONV_ID = "9da06df8-6bb7-4c4d-82b2-b337407030a6";

async function* fakeStream() {
  yield "New ";
  yield "response!";
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApiSession).mockResolvedValue({ session: mockSession, error: null });

  vi.mocked(db.insert).mockReturnValue({
    values: mockInsertValues,
  } as never);
  mockInsertValues.mockResolvedValue([]);

  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: mockWhere,
    }),
  } as never);
  mockWhere.mockReturnValue(createWhereResult([], []));

  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnValue({ where: mockConvUpdate }),
  } as never);
  mockConvUpdate.mockResolvedValue([]);

  vi.mocked(db.delete).mockReturnValue({
    where: mockDelete,
  } as never);
  mockDelete.mockResolvedValue([]);

  mockChat.mockReturnValue(fakeStream());
});

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/chat/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/regenerate", () => {
  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/chat/regenerate", {
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
    const res = await POST(makeRequest({ conversationId: CONV_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when conversationId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "conversationId is required and must be a valid UUID",
    });
  });

  it("returns 400 when conversationId is not a UUID", async () => {
    const res = await POST(makeRequest({ conversationId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when conversation is not owned by user", async () => {
    mockWhere.mockReturnValueOnce(createWhereResult([], []));
    const res = await POST(makeRequest({ conversationId: CONV_ID }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 400 when last message is not an assistant message", async () => {
    // First where: conversation lookup — found
    mockWhere
      .mockReturnValueOnce(
        createWhereResult([{ id: CONV_ID, userId: "user-1", model: "llama3.2" }])
      )
      // Second where: last message — user message
      .mockReturnValueOnce(
        createWhereResult(
          [{ id: "msg-1", role: "user", content: "Hi", model: null }],
          [{ id: "msg-1", role: "user", content: "Hi", model: null }]
        )
      );

    const res = await POST(makeRequest({ conversationId: CONV_ID }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Nothing to regenerate" });
  });

  it("returns streaming response and deletes old assistant message", async () => {
    const lastAssistant = {
      id: "msg-2",
      role: "assistant",
      content: "Old response",
      model: "llama3.2",
    };
    const historyRows = [{ role: "user", content: "Hi" }];

    mockWhere
      // conversation lookup
      .mockReturnValueOnce(
        createWhereResult([{ id: CONV_ID, userId: "user-1", model: "llama3.2" }])
      )
      // last message
      .mockReturnValueOnce(createWhereResult([lastAssistant], [lastAssistant]))
      // history after delete
      .mockReturnValueOnce(createWhereResult(historyRows, historyRows));

    const res = await POST(makeRequest({ conversationId: CONV_ID }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Conversation-Id")).toBe(CONV_ID);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toBe("New response!");

    // Verify delete was called
    expect(db.delete).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it("uses model override when provided", async () => {
    const lastAssistant = {
      id: "msg-2",
      role: "assistant",
      content: "Old",
      model: "llama3.2",
    };

    mockWhere
      .mockReturnValueOnce(
        createWhereResult([{ id: CONV_ID, userId: "user-1", model: "llama3.2" }])
      )
      .mockReturnValueOnce(createWhereResult([lastAssistant], [lastAssistant]))
      .mockReturnValueOnce(createWhereResult([], []));

    const res = await POST(
      makeRequest({ conversationId: CONV_ID, model: "mistral" })
    );
    expect(res.status).toBe(200);

    await res.text();
    expect(mockChat).toHaveBeenCalledWith([], "mistral");
  });
});
