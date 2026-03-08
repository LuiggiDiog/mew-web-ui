import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession, mockSelect, mockInsert } = vi.hoisted(() => ({
  mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/modules/auth/lib/api-auth", () => ({
  getApiSession: vi.fn().mockResolvedValue({ session: mockSession, error: null }),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: mockSelect }) }) }),
    insert: () => ({ values: () => ({ returning: mockInsert }) }),
  },
}));

vi.mock("@/db/schema", () => ({ conversations: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), desc: vi.fn() }));

import { GET, POST } from "./route";
import { getApiSession } from "@/modules/auth/lib/api-auth";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApiSession).mockResolvedValue({ session: mockSession, error: null });
});

describe("GET /api/conversations", () => {
  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    vi.mocked(getApiSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns conversations list", async () => {
    const fakeConvs = [{ id: "conv-1", title: "Test", userId: "user-1" }];
    mockSelect.mockResolvedValue(fakeConvs);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conversations).toEqual(fakeConvs);
  });
});

describe("POST /api/conversations", () => {
  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is missing", async () => {
    const req = new Request("http://localhost/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3.2", provider: "ollama" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when title exceeds max length", async () => {
    const req = new Request("http://localhost/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "a".repeat(201),
        model: "llama3.2",
        provider: "ollama",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates and returns a conversation", async () => {
    const newConv = { id: "conv-new", title: "New", model: "llama3.2", provider: "ollama" };
    mockInsert.mockResolvedValue([newConv]);
    const req = new Request("http://localhost/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New", model: "llama3.2", provider: "ollama" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.conversation).toEqual(newConv);
  });
});
