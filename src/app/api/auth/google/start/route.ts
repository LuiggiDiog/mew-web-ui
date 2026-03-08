import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/modules/auth/lib/session";
import { buildGoogleAuthUrl } from "@/modules/auth/lib/google-oauth";

export async function GET() {
  const session = await getSession();
  const state = randomUUID();
  const authUrl = buildGoogleAuthUrl(state);

  if (!authUrl) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  session.oauthState = state;
  await session.save();

  return NextResponse.redirect(authUrl);
}
