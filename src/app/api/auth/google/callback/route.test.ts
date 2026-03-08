import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  returning: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));

mocks.values.mockImplementation(() => ({ returning: mocks.returning }));
mocks.insert.mockImplementation(() => ({ values: mocks.values }));

vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst: mocks.findFirst,
      },
    },
    insert: mocks.insert,
  },
}));

vi.mock("@/modules/auth/lib/session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/modules/auth/lib/session";
import { GET } from "./route";

const mockSession = {
  userId: undefined as string | undefined,
  email: undefined as string | undefined,
  displayName: undefined as string | undefined,
  oauthState: "oauth-state",
  save: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.userId = undefined;
  mockSession.email = undefined;
  mockSession.displayName = undefined;
  mockSession.oauthState = "oauth-state";

  vi.mocked(getSession).mockResolvedValue(mockSession as never);

  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";

  vi.stubGlobal("fetch", vi.fn());
});

describe("GET /api/auth/google/callback", () => {
  it("redirects to login with error when oauth state is invalid", async () => {
    const req = new Request(
      "http://localhost:3000/api/auth/google/callback?code=code-123&state=bad-state"
    );

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?error=oauth_state");
  });

  it("creates a new google user and signs in", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    mocks.returning.mockResolvedValue([
      {
        id: "new-user",
        email: "new-google@example.com",
        displayName: "New Google User",
        authProvider: "google",
        passwordHash: null,
        googleSub: "google-sub-1",
      },
    ]);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "token-123" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sub: "google-sub-1",
            email: "new-google@example.com",
            email_verified: true,
            name: "New Google User",
          }),
      } as Response);

    const req = new Request(
      "http://localhost:3000/api/auth/google/callback?code=code-123&state=oauth-state"
    );

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/chat");
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mockSession.userId).toBe("new-user");
    expect(mockSession.email).toBe("new-google@example.com");
    expect(mockSession.displayName).toBe("New Google User");
    expect(mockSession.save).toHaveBeenCalledTimes(1);
  });

  it("signs in existing google user", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "existing-user",
      email: "existing@example.com",
      displayName: "Existing",
      authProvider: "google",
      passwordHash: null,
      googleSub: "google-sub-2",
      createdAt: new Date(),
    });

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "token-123" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sub: "google-sub-2",
            email: "existing@example.com",
            email_verified: true,
            name: "Existing",
          }),
      } as Response);

    const req = new Request(
      "http://localhost:3000/api/auth/google/callback?code=code-123&state=oauth-state"
    );

    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/chat");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mockSession.userId).toBe("existing-user");
    expect(mockSession.save).toHaveBeenCalledTimes(1);
  });
});
