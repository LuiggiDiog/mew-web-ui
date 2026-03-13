import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIsConnected, mockListModels } = vi.hoisted(() => ({
  mockIsConnected: vi.fn(),
  mockListModels: vi.fn(),
}));

vi.mock("@/modules/providers/lib/comfyui", () => ({
  ComfyUIClient: vi.fn().mockImplementation(function () {
    return { isConnected: mockIsConnected, listModels: mockListModels };
  }),
}));

vi.mock("@/modules/auth/lib/api-auth", () => ({
  getApiSession: vi.fn().mockResolvedValue({
    session: { userId: "user-1", email: "test@test.com", displayName: "Test" },
    error: null,
  }),
}));

import { GET } from "./route";
import { getApiSession } from "@/modules/auth/lib/api-auth";

describe("GET /api/providers/comfyui/models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiSession).mockResolvedValue({
      session: { userId: "user-1", email: "test@test.com", displayName: "Test" },
      error: null,
    });
    mockIsConnected.mockResolvedValue(true);
  });

  it("returns auth error when session fails", async () => {
    const { NextResponse } = await import("next/server");
    vi.mocked(getApiSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns models list", async () => {
    mockListModels.mockResolvedValue([{ name: "z-image" }, { name: "other" }]);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      models: [{ name: "z-image" }, { name: "other" }],
    });
  });

  it("returns 503 when listModels throws", async () => {
    mockListModels.mockRejectedValue(new Error("boom"));

    const res = await GET();
    expect(res.status).toBe(503);
  });
});
