import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/services/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/modules/auth/services/bootstrap", () => {
  class BootstrapAlreadyCompletedError extends Error {
    constructor() {
      super("Bootstrap already completed");
      this.name = "BootstrapAlreadyCompletedError";
    }
  }

  return {
    BootstrapAlreadyCompletedError,
    isBootstrapRequired: vi.fn(),
    registerInitialAdmin: vi.fn(),
  };
});

import { getSession } from "@/modules/auth/services/session";
import {
  BootstrapAlreadyCompletedError,
  isBootstrapRequired,
  registerInitialAdmin,
} from "@/modules/auth/services/bootstrap";
import { GET, POST } from "./route";

const mockSession = {
  userId: undefined as string | undefined,
  email: undefined as string | undefined,
  displayName: undefined as string | undefined,
  save: vi.fn(),
};

describe("Auth bootstrap route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.userId = undefined;
    mockSession.email = undefined;
    mockSession.displayName = undefined;
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(isBootstrapRequired).mockResolvedValue(false);
  });

  it("GET returns bootstrap status", async () => {
    vi.mocked(isBootstrapRequired).mockResolvedValue(true);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ needsBootstrap: true });
  });

  it("POST returns 400 when JSON is invalid", async () => {
    const req = new Request("http://localhost/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    const res = await POST(req as never);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("POST returns 400 when fields are missing", async () => {
    const req = new Request("http://localhost/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com" }),
    });

    const res = await POST(req as never);

    expect(res.status).toBe(400);
  });

  it("POST returns 409 when bootstrap is already completed", async () => {
    vi.mocked(registerInitialAdmin).mockRejectedValue(new BootstrapAlreadyCompletedError());

    const req = new Request("http://localhost/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.com",
        displayName: "Admin",
        password: "secure-pass-123",
      }),
    });

    const res = await POST(req as never);

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "Bootstrap already completed" });
  });

  it("POST creates first admin, saves session, and returns 201", async () => {
    vi.mocked(registerInitialAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      displayName: "Admin",
      passwordHash: "hash",
      authProvider: "local",
      googleSub: null,
      createdAt: new Date(),
    });

    const req = new Request("http://localhost/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.com",
        displayName: "Admin",
        password: "secure-pass-123",
      }),
    });

    const res = await POST(req as never);

    expect(res.status).toBe(201);
    expect(mockSession.userId).toBe("user-1");
    expect(mockSession.save).toHaveBeenCalledTimes(1);
  });
});
