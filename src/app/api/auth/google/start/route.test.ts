import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/lib/session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/modules/auth/lib/session";
import { GET } from "./route";

const mockSession = {
  oauthState: undefined as string | undefined,
  save: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.oauthState = undefined;
  vi.mocked(getSession).mockResolvedValue(mockSession as never);
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
});

describe("GET /api/auth/google/start", () => {
  it("returns 503 when oauth is not configured", async () => {
    process.env.GOOGLE_CLIENT_ID = "";

    const response = await GET();

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe("Google OAuth is not configured");
  });

  it("redirects to google auth url and saves oauth state", async () => {
    const response = await GET();

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location!);

    expect(redirectUrl.origin).toBe("https://accounts.google.com");
    expect(redirectUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(redirectUrl.searchParams.get("client_id")).toBe("google-client-id");
    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback"
    );
    expect(redirectUrl.searchParams.get("response_type")).toBe("code");
    expect(redirectUrl.searchParams.get("scope")).toContain("openid");

    expect(mockSession.oauthState).toBeTruthy();
    expect(mockSession.save).toHaveBeenCalledTimes(1);
    expect(redirectUrl.searchParams.get("state")).toBe(mockSession.oauthState);
  });
});
