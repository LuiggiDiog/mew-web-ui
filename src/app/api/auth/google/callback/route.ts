import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/modules/auth/lib/session";
import {
  exchangeCodeForGoogleUser,
  resolveGoogleRedirectUri,
  resolveRequestOrigin,
} from "@/modules/auth/lib/google-oauth";

function redirectWithError(request: Request, error: string) {
  const origin = resolveRequestOrigin(request);
  return NextResponse.redirect(new URL(`/login?error=${error}`, origin));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const session = await getSession();
  if (!code) return redirectWithError(request, "oauth_code");
  if (!state || !session.oauthState || state !== session.oauthState) {
    return redirectWithError(request, "oauth_state");
  }

  const requestOrigin = resolveRequestOrigin(request);
  const redirectUri = session.oauthRedirectUri ?? resolveGoogleRedirectUri(requestOrigin);
  const profile = await exchangeCodeForGoogleUser(code, redirectUri);
  if (!profile) return redirectWithError(request, "oauth_exchange");
  if (!profile.email_verified) return redirectWithError(request, "oauth_email_unverified");

  const normalizedEmail = profile.email.trim().toLowerCase();
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existingUser && existingUser.authProvider === "local") {
    return redirectWithError(request, "account_exists_manual");
  }

  let user = existingUser;
  if (!user) {
    const [created] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        displayName: profile.name?.trim() || normalizedEmail.split("@")[0],
        passwordHash: null,
        authProvider: "google",
        googleSub: profile.sub,
      })
      .returning();
    user = created;
  }

  session.userId = user.id;
  session.email = user.email;
  session.displayName = user.displayName;
  session.oauthState = undefined;
  session.oauthRedirectUri = undefined;
  await session.save();

  return NextResponse.redirect(new URL("/chat", requestOrigin));
}
