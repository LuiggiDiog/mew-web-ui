import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/services/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/modules/auth/services/bootstrap", () => ({
  isBootstrapRequired: vi.fn().mockResolvedValue(false),
}));

import { getSession } from "@/modules/auth/services/session";
import { isBootstrapRequired } from "@/modules/auth/services/bootstrap";
import { GET } from "./route";
import { setEnv } from "@/env";

const mockSession = {
  oauthState: undefined as string | undefined,
  oauthRedirectUri: undefined as string | undefined,
  save: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.oauthState = undefined;
  mockSession.oauthRedirectUri = undefined;
  vi.mocked(getSession).mockResolvedValue(mockSession as never);
  vi.mocked(isBootstrapRequired).mockResolvedValue(false);
  setEnv("GOOGLE_CLIENT_ID", "google-client-id");
  setEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
  setEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback");
});

describe("GET /api/auth/google/start", () => {
  it("redirects to login when bootstrap is required", async () => {
    vi.mocked(isBootstrapRequired).mockResolvedValue(true);

    const response = await GET(new Request("http://localhost:3000/api/auth/google/start"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?error=bootstrap_required");
  });

  it("returns 503 when oauth is not configured", async () => {
    setEnv("GOOGLE_CLIENT_ID", "");

    const response = await GET(new Request("http://localhost:3000/api/auth/google/start"));

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe("Google OAuth is not configured");
  });

  it("redirects to google auth url and saves oauth state", async () => {
    const response = await GET(new Request("http://localhost:3000/api/auth/google/start"));

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
    expect(mockSession.oauthRedirectUri).toBe("http://localhost:3000/api/auth/google/callback");
    expect(mockSession.save).toHaveBeenCalledTimes(1);
    expect(redirectUrl.searchParams.get("state")).toBe(mockSession.oauthState);
  });

  it("builds redirect uri from request origin when env is not set", async () => {
    setEnv("GOOGLE_REDIRECT_URI", "");

    const response = await GET(new Request("https://example.ngrok.app/api/auth/google/start"));
    const location = response.headers.get("location");
    const redirectUrl = new URL(location!);

    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "https://example.ngrok.app/api/auth/google/callback"
    );
    expect(mockSession.oauthRedirectUri).toBe("https://example.ngrok.app/api/auth/google/callback");
  });

  it("prefers forwarded headers for origin behind reverse proxy", async () => {
    setEnv("GOOGLE_REDIRECT_URI", "");

    const req = new Request("http://localhost:3000/api/auth/google/start", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "proxy.ngrok.app",
      },
    });

    const response = await GET(req);
    const location = response.headers.get("location");
    const redirectUrl = new URL(location!);

    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "https://proxy.ngrok.app/api/auth/google/callback"
    );
    expect(mockSession.oauthRedirectUri).toBe("https://proxy.ngrok.app/api/auth/google/callback");
  });
});
