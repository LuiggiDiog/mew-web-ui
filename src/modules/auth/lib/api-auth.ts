import { NextResponse } from "next/server";
import { getSession, type SessionData } from "./session";

/**
 * Returns the session for API routes.
 * If the session has no userId, returns a 401 NextResponse instead.
 */
export async function getApiSession(): Promise<
  { session: Required<SessionData>; error: null } |
  { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session.userId) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session: session as Required<SessionData>, error: null };
}
