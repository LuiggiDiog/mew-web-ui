import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSession: { userId?: string; email?: string; displayName?: string } = {};

vi.mock("@/modules/auth/lib/session", () => ({
  sessionOptions: { password: "test-secret", cookieName: "test_session" },
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mockSession)),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.userId = undefined;
  mockSession.email = undefined;
  mockSession.displayName = undefined;
});

describe("GET /api/auth/me", () => {
  it("returns 401 when session has no userId", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with user when session is valid", async () => {
    mockSession.userId = "user-1";
    mockSession.email = "test@test.com";
    mockSession.displayName = "Test User";
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
