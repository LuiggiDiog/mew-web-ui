import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  email?: string;
  displayName?: string;
  oauthState?: string;
  oauthRedirectUri?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "fallback-dev-secret-change-in-production",
  cookieName: process.env.SESSION_COOKIE_NAME ?? "workspace_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};
