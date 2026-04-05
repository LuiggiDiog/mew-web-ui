import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/modules/auth/services/api-auth", () => ({
  getApiSession: vi.fn(),
}));

import { GET } from "./route";
import { getApiSession } from "@/modules/auth/services/api-auth";

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    vi.mocked(getApiSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 200 with user when session is valid", async () => {
    vi.mocked(getApiSession).mockResolvedValue({
      session: { userId: "user-1", email: "test@test.com", displayName: "Test User" },
      error: null,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toMatchObject({
      id: "user-1",
      email: "test@test.com",
      displayName: "Test User",
    });
  });
});
