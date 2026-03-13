import type { SessionOptions } from "iron-session";
import { env } from "@/env";

export interface SessionData {
  userId?: string;
  email?: string;
  displayName?: string;
  oauthState?: string;
  oauthRedirectUri?: string;
}

const SESSION_SECRET = env.sessionSecret;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET is required and must be at least 32 characters long"
  );
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: env.sessionCookieName,
  cookieOptions: {
    secure: env.isProduction,
    httpOnly: true,
    sameSite: "lax",
  },
};
