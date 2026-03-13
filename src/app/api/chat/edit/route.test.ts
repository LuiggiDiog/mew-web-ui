import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSession,
  mockInsertValues,
  mockWhere,
  mockConvOrMessageUpdateWhere,
  mockChat,
  mockDeleteWhere,
} = vi.hoisted(() => ({
  mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
  mockInsertValues: vi.fn(),
  mockWhere: vi.fn(),
  mockConvOrMessageUpdateWhere: vi.fn(),
  mockChat: vi.fn(),
  mockDeleteWhere: vi.fn(),
}));

vi.mock("@/modules/auth/services/api-auth", () => ({
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
import { getApiSession } from "@/modules/auth/services/api-auth";
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
const MSG_ID = "2917f9f4-f2ca-4f55-8d35-b77e09e63f80";

async function* fakeStream() {
  yield "Edited ";
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
    set: vi.fn().mockReturnValue({ where: mockConvOrMessageUpdateWhere }),
  } as never);
  mockConvOrMessageUpdateWhere.mockResolvedValue([]);

  vi.mocked(db.delete).mockReturnValue({
    where: mockDeleteWhere,
  } as never);
  mockDeleteWhere.mockResolvedValue([]);

  mockChat.mockReturnValue(fakeStream());
});

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/chat/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/edit", () => {
  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/chat/edit", {
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
    const res = await POST(
      makeRequest({ conversationId: CONV_ID, messageId: MSG_ID, content: "Hi" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when conversationId is missing", async () => {
    const res = await POST(makeRequest({ messageId: MSG_ID, content: "Hi" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "conversationId is required and must be a valid UUID",
    });
  });

  it("returns 400 when messageId is missing", async () => {
    const res = await POST(makeRequest({ conversationId: CONV_ID, content: "Hi" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "messageId is required and must be a valid UUID",
    });
  });

  it("returns 400 when content is empty", async () => {
    const res = await POST(
      makeRequest({ conversationId: CONV_ID, messageId: MSG_ID, content: "   " })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "content is required and must be non-empty",
    });
  });

  it("returns 404 when conversation is not owned by user", async () => {
    mockWhere.mockReturnValueOnce(createWhereResult([], []));

    const res = await POST(
      makeRequest({ conversationId: CONV_ID, messageId: MSG_ID, content: "Hi" })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 404 when target message does not exist", async () => {
    mockWhere
      .mockReturnValueOnce(
        createWhereResult([{ id: CONV_ID, userId: "user-1", model: "llama3.2" }])
      )
      .mockReturnValueOnce(createWhereResult([], []));

    const res = await POST(
      makeRequest({ conversationId: CONV_ID, messageId: MSG_ID, content: "Hi" })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Message not found" });
  });

  it("returns 400 when target message is not user role", async () => {
    mockWhere
      .mockReturnValueOnce(
        createWhereResult([{ id: CONV_ID, userId: "user-1", model: "llama3.2" }])
      )
      .mockReturnValueOnce(
        createWhereResult(
          [{ id: MSG_ID, role: "assistant", content: "Nope" }],
          [{ id: MSG_ID, role: "assistant", content: "Nope" }]
        )
      );

    const res = await POST(
      makeRequest({ conversationId: CONV_ID, messageId: MSG_ID, content: "Hi" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Only user messages can be edited",
    });
  });

  it("updates message, deletes trailing messages and streams edited response", async () => {
    const historyRows = [
      { id: "m-4", role: "assistant", content: "Old answer" },
      { id: MSG_ID, role: "user", content: "Old question" },
      { id: "m-2", role: "assistant", content: "Answer 1" },
      { id: "m-1", role: "user", content: "Question 1" },
    ];

    mockWhere
      .mockReturnValueOnce(
        createWhereResult([{ id: CONV_ID, userId: "user-1", model: "llama3.2" }])
      )
      .mockReturnValueOnce(createWhereResult(historyRows, historyRows));

    const res = await POST(
      makeRequest({
        conversationId: CONV_ID,
        messageId: MSG_ID,
        content: "Edited question",
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Conversation-Id")).toBe(CONV_ID);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toBe("Edited response!");

    expect(db.update).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockChat).toHaveBeenCalledWith(
      [
        { role: "user", content: "Question 1" },
        { role: "assistant", content: "Answer 1" },
        { role: "user", content: "Edited question" },
      ],
      "llama3.2",
      expect.any(AbortSignal)
    );
  });

  it("uses model override when provided", async () => {
    const historyRows = [{ id: MSG_ID, role: "user", content: "Old question" }];

    mockWhere
      .mockReturnValueOnce(
        createWhereResult([{ id: CONV_ID, userId: "user-1", model: "llama3.2" }])
      )
      .mockReturnValueOnce(createWhereResult(historyRows, historyRows));

    const res = await POST(
      makeRequest({
        conversationId: CONV_ID,
        messageId: MSG_ID,
        content: "Edited question",
        model: "mistral",
      })
    );
    expect(res.status).toBe(200);

    await res.text();
    expect(mockChat).toHaveBeenCalledWith(
      [{ role: "user", content: "Edited question" }],
      "mistral",
      expect.any(AbortSignal)
    );
  });
});
