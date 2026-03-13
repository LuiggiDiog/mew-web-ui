import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/modules/auth/services/session";
import {
  buildGoogleAuthUrl,
  resolveGoogleRedirectUri,
  resolveRequestOrigin,
} from "@/modules/auth/services/google-oauth";

export async function GET(request: Request) {
  const session = await getSession();
  const state = randomUUID();
  const requestOrigin = resolveRequestOrigin(request);
  const redirectUri = resolveGoogleRedirectUri(requestOrigin);
  const authUrl = buildGoogleAuthUrl(state, redirectUri);

  if (!authUrl) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  session.oauthState = state;
  session.oauthRedirectUri = redirectUri;
  await session.save();

  return NextResponse.redirect(authUrl);
}
