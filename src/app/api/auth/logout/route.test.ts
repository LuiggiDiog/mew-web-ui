import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession } = vi.hoisted(() => ({
  mockSession: { userId: "user-1", destroy: vi.fn() },
}));

vi.mock("@/modules/auth/lib/session", () => ({
  sessionOptions: { password: "test-secret", cookieName: "test_session" },
  getSession: vi.fn().mockResolvedValue(mockSession),
}));

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.destroy.mockReset();
});

describe("POST /api/auth/logout", () => {
  it("destroys the session and returns 200", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockSession.destroy).toHaveBeenCalledOnce();
  });

  it("returns { ok: true }", async () => {
    const res = await POST();
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });
});
