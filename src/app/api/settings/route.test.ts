import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession, mockSelect, mockInsert, mockListModels } = vi.hoisted(() => ({
  mockSession: { userId: "user-1", email: "test@test.com", displayName: "Test" },
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockListModels: vi.fn(),
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
vi.mock("@/modules/providers/lib/ollama", () => ({
  OllamaClient: vi.fn().mockImplementation(function () {
    return { listModels: mockListModels };
  }),
}));

import { GET, PATCH } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockListModels.mockResolvedValue([]);
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

  it("normalizes defaultModel when saved value is not available", async () => {
    mockSelect.mockResolvedValue([
      { key: "defaultModel", value: "unknown-model" },
      { key: "darkMode", value: "true" },
    ]);
    mockListModels.mockResolvedValue([
      { name: "llama3.2:latest", modified_at: "2024-01-01", size: 1000 },
      { name: "phi4:latest", modified_at: "2024-01-02", size: 2000 },
    ]);
    mockInsert.mockResolvedValue(undefined);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toEqual({
      darkMode: "true",
      defaultModel: "llama3.2:latest",
    });
    expect(mockInsert).toHaveBeenCalledTimes(1);
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
