import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/modules/auth/lib/session", () => ({
  sessionOptions: { password: "test-secret", cookieName: "test_session" },
  getSession: vi.fn(),
}));

vi.mock("iron-session", () => ({
  getIronSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

import { db } from "@/db";
import { getSession } from "@/modules/auth/lib/session";
import { getIronSession } from "iron-session";
import { POST } from "./route";

const mockSession = {
  userId: undefined as string | undefined,
  email: undefined as string | undefined,
  displayName: undefined as string | undefined,
  save: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.userId = undefined;
  mockSession.email = undefined;
  mockSession.displayName = undefined;
  vi.mocked(getSession).mockResolvedValue(mockSession as never);
  vi.mocked(getIronSession).mockResolvedValue(mockSession as never);
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not found", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@test.com", password: "secret" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when password is wrong", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      displayName: "Test",
      // bcrypt hash of "correct-password"
      passwordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewSXHqm.9/AjMVEi",
      createdAt: new Date(),
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "wrong-password" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when account is Google-only", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-2",
      email: "google@test.com",
      displayName: "Google User",
      passwordHash: null,
      authProvider: "google",
      googleSub: "sub-123",
      createdAt: new Date(),
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "google@test.com", password: "any-password" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("This account uses Google sign-in");
  });

  it("returns 200 and saves session when credentials are valid", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      displayName: "Test",
      passwordHash: "$2b$12$wOiWb4.nzqxI6cl9hJT8veqiGVRqer9TiICKqQF8zQRK0jGzDzBJW",
      authProvider: "local",
      googleSub: null,
      createdAt: new Date(),
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "correct-password" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSession.save).toHaveBeenCalledTimes(1);
  });
});
