import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  email?: string;
  displayName?: string;
  oauthState?: string;
  oauthRedirectUri?: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET is required and must be at least 32 characters long"
  );
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: process.env.SESSION_COOKIE_NAME ?? "workspace_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};
