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
    select: () => ({ from: () => ({ where: mockSelect }) }),
    insert: () => ({
      values: () => ({ onConflictDoUpdate: () => mockInsert() }),
    }),
  },
}));

vi.mock("@/db/schema", () => ({ settings: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

import { GET, PATCH } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/settings", () => {
  it("returns settings as flat key-value object", async () => {
    mockSelect.mockResolvedValue([
      { key: "darkMode", value: "true" },
      { key: "saveHistory", value: "false" },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ darkMode: "true", saveHistory: "false" });
  });
});

describe("PATCH /api/settings", () => {
  it("upserts each key-value pair and returns ok", async () => {
    mockInsert.mockResolvedValue(undefined);
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: "true", saveHistory: "false" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });
});
