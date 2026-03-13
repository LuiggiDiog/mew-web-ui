import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSession,
  mockWhere,
  mockDeleteReturning,
  mockUpdateReturning,
} = vi.hoisted(() => ({
  mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
  mockWhere: vi.fn(),
  mockDeleteReturning: vi.fn(),
  mockUpdateReturning: vi.fn(),
}));

vi.mock("@/modules/auth/services/api-auth", () => ({
  getApiSession: vi.fn().mockResolvedValue({ session: mockSession, error: null }),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({ conversations: {}, messages: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), asc: vi.fn() }));

import { GET, DELETE, PATCH } from "./route";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { db } from "@/db";

function createWhereResult<TDirect, TLimited = TDirect>(
  directRows: TDirect,
  limitedRows?: TLimited
) {
  const orderBy = vi.fn().mockResolvedValue((limitedRows ?? directRows) as TDirect | TLimited);
  const result = Promise.resolve(directRows) as Promise<TDirect> & {
    orderBy: typeof orderBy;
  };
  result.orderBy = orderBy;
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApiSession).mockResolvedValue({ session: mockSession, error: null });

  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: mockWhere,
    }),
  } as never);
  mockWhere.mockReturnValue(createWhereResult([], []));

  vi.mocked(db.delete).mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: mockDeleteReturning,
    }),
  } as never);
  mockDeleteReturning.mockResolvedValue([]);

  vi.mocked(db.update).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mockUpdateReturning,
      }),
    }),
  } as never);
  mockUpdateReturning.mockResolvedValue([]);
});

describe("/api/conversations/[id]", () => {
  it("GET returns 400 when id is not a UUID", async () => {
    const req = new Request("http://localhost/api/conversations/not-a-uuid");
    const res = await GET(req as never, { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBe(400);
  });

  it("DELETE returns 400 when id is not a UUID", async () => {
    const req = new Request("http://localhost/api/conversations/not-a-uuid", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when id is not a UUID", async () => {
    const req = new Request("http://localhost/api/conversations/not-a-uuid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New title" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when body is invalid JSON", async () => {
    const req = new Request(
      "http://localhost/api/conversations/9da06df8-6bb7-4c4d-82b2-b337407030a6",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }
    );
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "9da06df8-6bb7-4c4d-82b2-b337407030a6" }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when title exceeds max length", async () => {
    const req = new Request(
      "http://localhost/api/conversations/9da06df8-6bb7-4c4d-82b2-b337407030a6",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "a".repeat(201) }),
      }
    );
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "9da06df8-6bb7-4c4d-82b2-b337407030a6" }),
    });
    expect(res.status).toBe(400);
  });
});
