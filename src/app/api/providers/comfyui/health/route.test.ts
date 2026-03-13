import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIsConnected } = vi.hoisted(() => ({
  mockIsConnected: vi.fn(),
}));

vi.mock("@/modules/providers/lib/comfyui", () => ({
  ComfyUIClient: vi.fn().mockImplementation(function () {
    return { isConnected: mockIsConnected };
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

describe("GET /api/providers/comfyui/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiSession).mockResolvedValue({
      session: { userId: "user-1", email: "test@test.com", displayName: "Test" },
      error: null,
    });
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

  it("returns connected true", async () => {
    mockIsConnected.mockResolvedValue(true);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ connected: true });
  });

  it("returns connected false", async () => {
    mockIsConnected.mockResolvedValue(false);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ connected: false });
  });
});
